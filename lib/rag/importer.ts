/**
 * Shared ingestion core for structured sources. A source only has to produce
 * ImportRecords; this handles chapters, batched inserts, embedding, resume and
 * retries.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import {
  createBook,
  batchCreateChapters,
  batchCreateHadiths,
  batchCreateHadithChunks,
  deleteChunksForHadiths,
  getBookByExternalId,
  getChaptersForBook,
  getChunkProgress,
  getHadithKeys,
  deleteBook,
  updateBookHadithCount,
} from './db';
import { chunkText } from './chunker';
import { embedDocuments } from './embedder';
import { parseHadith } from './parser';
import { errorMessage } from '../errors';
import type { Book, DocType, HadithGrading } from './types';

export interface ImportRecord {
  /** Number as the source cites it, e.g. "56", "Sermon 4". */
  number: string;
  chapter: string;
  category?: string;
  /** Primary text in the original language. */
  text: string;
  translation?: string;
  gradings?: HadithGrading[];
  sourceUrl?: string;
}

export interface BookMeta {
  externalId: string;
  title: string;
  author?: string;
  translator?: string;
  language: Book['language'];
  docType: DocType;
  sourceUrl?: string;
}

export interface BookSource {
  meta: BookMeta;
  /** Hadith sources carry an isnad to split out; prose (Nahj, rulings) doesn't. */
  isnad?: boolean;
  /** Metadata only known after fetching (translator, full title) may refine `meta`. */
  load: () => Promise<{ records: ImportRecord[]; meta?: Partial<BookMeta> }>;
}

const HADITH_BATCH = 200;
const EMBED_SLICE = 256;
// Supabase cancels statements after a few seconds; inserting 256 vectors into a
// growing HNSW index tipped past that, so rows go in small batches.
const CHUNK_INSERT_BATCH = 50;
const MAX_CHUNK_TOKENS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retries transient failures — statement timeouts, DNS blips, dropped sockets.
 * Patient on purpose: three quick retries once lost seven hours of embedding to
 * a momentary DNS failure.
 */
export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 7): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      const wait = Math.min(2000 * 2 ** (i - 1), 30_000);
      process.stdout.write(`\n    ${label}: ${errorMessage(err)} — retry ${i}/${attempts - 1} in ${wait / 1000}s\n`);
      await sleep(wait);
    }
  }
}

const LOCK = '.import.lock';

/**
 * Concurrent runs corrupt each other: each treats the other's in-progress book
 * as an interrupted import and deletes it mid-write.
 */
export function acquireImportLock(): void {
  if (existsSync(LOCK)) {
    const pid = Number(readFileSync(LOCK, 'utf8'));
    let alive = false;
    try {
      process.kill(pid, 0);
      alive = true;
    } catch {
      /* stale lock — owner is gone */
    }
    if (alive) {
      console.error(`Another import is already running (pid ${pid}). Stop it first, or delete ${LOCK} if stale.`);
      process.exit(1);
    }
  }
  writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => rmSync(LOCK, { force: true }));
  for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => process.exit(130));
}

function embeddingBody(r: ImportRecord): string {
  // Original and translation embedded together so a query in either language hits.
  return [r.text, r.translation].filter(Boolean).join('\n\n');
}

export async function dryRunBook(source: BookSource): Promise<{ records: number; chunks: number }> {
  const loaded = await source.load();
  const records = loaded.records.filter((r) => r.text.trim());
  const chapters = new Set(records.map((r) => r.chapter)).size;
  const chunks = records.reduce((n, r) => n + chunkText(embeddingBody(r), { maxChunkLength: MAX_CHUNK_TOKENS }).length, 0);
  const graded = records.filter((r) => r.gradings?.length).length;
  const translated = records.filter((r) => r.translation).length;
  const pct = (n: number) => (records.length ? `${Math.round((100 * n) / records.length)}%` : '-');

  console.log(
    `  ${source.meta.externalId.padEnd(36)} ${String(records.length).padStart(6)} records ` +
      `${String(chapters).padStart(5)} chapters ${String(chunks).padStart(7)} chunks  ` +
      `translated ${pct(translated)}  graded ${pct(graded)}`,
  );
  return { records: records.length, chunks };
}

export async function importBook(source: BookSource, { force = false } = {}): Promise<void> {
  const { meta } = source;

  // total_hadiths is written last, so zero means a previous run died partway.
  const existing = await getBookByExternalId(meta.externalId);
  const complete = existing !== null && existing.totalHadiths > 0;
  if (complete && !force) {
    console.log(`  ${meta.externalId} — already imported, skipping`);
    return;
  }

  const loaded = await source.load();
  const records = loaded.records.filter((r) => r.text.trim());
  if (records.length === 0) {
    console.log(`  ${meta.externalId} — no content available, skipped`);
    return;
  }

  // A few sources repeat a number (the Khamenei book has six). Disambiguate
  // deterministically so saved rows can be matched back to records on a resume.
  const counts = new Map<string, number>();
  const items = records.map((record) => {
    const n = (counts.get(record.number) ?? 0) + 1;
    counts.set(record.number, n);
    return { record, number: n === 1 ? record.number : `${record.number} (${n})` };
  });

  // Re-importing a finished book starts clean; an interrupted one keeps what it
  // already wrote and only finishes the missing work.
  const resuming = existing !== null && !complete && !force;
  if (existing && !resuming) {
    console.log(`  ${meta.externalId} — re-importing`);
    await withRetry('delete previous', () => deleteBook(existing.id));
  }

  const book =
    resuming && existing
      ? existing
      : await withRetry('create book', () => createBook({ ...meta, ...loaded.meta, totalHadiths: 0 }));

  const chapterIdFor = new Map<string, string>();
  if (resuming) for (const c of await getChaptersForBook(book.id)) chapterIdFor.set(c.title, c.id);

  const categoryFor = new Map<string, string | undefined>();
  const newChapters: string[] = [];
  for (const { record } of items) {
    if (categoryFor.has(record.chapter)) continue;
    categoryFor.set(record.chapter, record.category);
    if (!chapterIdFor.has(record.chapter)) newChapters.push(record.chapter);
  }

  const firstOrder = chapterIdFor.size;
  for (let i = 0; i < newChapters.length; i += HADITH_BATCH) {
    const slice = newChapters.slice(i, i + HADITH_BATCH);
    const saved = await withRetry('insert chapters', () =>
      batchCreateChapters(
        slice.map((title, n) => ({
          bookId: book.id,
          title,
          category: categoryFor.get(title),
          orderIndex: firstOrder + i + n,
        })),
      ),
    );
    saved.forEach((c) => chapterIdFor.set(c.title, c.id));
  }

  const withIsnad = source.isnad ?? meta.docType === 'hadith';
  const idByNumber = new Map<string, string>();
  if (resuming) for (const row of await getHadithKeys(book.id)) idByNumber.set(row.hadithNumber, row.id);

  // Only narrations not already stored get inserted.
  const missing = items.filter((i) => !idByNumber.has(i.number));
  for (let i = 0; i < missing.length; i += HADITH_BATCH) {
    const slice = missing.slice(i, i + HADITH_BATCH);
    const rows = slice.map(({ record, number }) => {
      const isnad = withIsnad ? parseHadith(record.text) : undefined;
      return {
        bookId: book.id,
        chapterId: chapterIdFor.get(record.chapter)!,
        hadithNumber: number,
        isnadRaw: isnad?.isnadRaw || '',
        matnArabic: record.text,
        matnTranslation: record.translation,
        narrators: (isnad?.narrators ?? []).map((name, k) => ({
          id: `${meta.externalId}-${number}-${k}`,
          canonicalName: name,
          nameVariants: [name],
        })),
        gradings: record.gradings,
        language: meta.language,
        sourceUrl: record.sourceUrl,
      };
    });

    // A multi-row INSERT ... RETURNING preserves order, pairing rows to records.
    const inserted = await withRetry('insert records', () => batchCreateHadiths(rows));
    if (inserted.length !== slice.length) {
      throw new Error(`Expected ${slice.length} records back, got ${inserted.length}`);
    }
    inserted.forEach((h, n) => idByNumber.set(slice[n].number, h.id));
  }

  // Narrations whose chunks are all present are left alone. One cut off partway
  // has fewer chunks than it recorded needing, so clear it and redo it whole.
  const progress = resuming ? await getChunkProgress(book.id) : new Map();
  const partial = [...progress].filter(([, p]) => p.stored < p.expected).map(([id]) => id);
  if (partial.length) await withRetry('clear partial chunks', () => deleteChunksForHadiths(partial));

  const embedded = new Set([...progress].filter(([, p]) => p.stored >= p.expected).map(([id]) => id));

  const work = items.flatMap(({ record, number }) => {
    const hadithId = idByNumber.get(number)!;
    if (embedded.has(hadithId)) return [];

    const chunks = chunkText(embeddingBody(record), { maxChunkLength: MAX_CHUNK_TOKENS });
    return chunks.map((text, chunkIndex) => ({
      hadithId,
      chapterId: chapterIdFor.get(record.chapter)!,
      text,
      chunkIndex,
      totalChunks: chunks.length,
    }));
  });

  if (resuming) {
    console.log(
      `  ${meta.externalId} — resuming: ${embedded.size}/${items.length} narrations already embedded, ` +
        `${work.length} chunks left`,
    );
  }

  let done = 0;
  for (let i = 0; i < work.length; i += EMBED_SLICE) {
    const slice = work.slice(i, i + EMBED_SLICE);
    const embeddings = await embedDocuments(slice.map((w) => w.text));
    const rows = slice.map((w, j) => ({
      hadithId: w.hadithId,
      bookId: book.id,
      chapterId: w.chapterId,
      chunkText: w.text,
      embedding: embeddings[j],
      chunkIndex: w.chunkIndex,
      totalChunks: w.totalChunks,
    }));

    for (let k = 0; k < rows.length; k += CHUNK_INSERT_BATCH) {
      await withRetry('insert chunks', () => batchCreateHadithChunks(rows.slice(k, k + CHUNK_INSERT_BATCH)));
    }

    done += slice.length;
    process.stdout.write(`\r  ${meta.externalId} — embedding ${done}/${work.length} chunks   `);
  }

  await withRetry('finalise', () => updateBookHadithCount(book.id, items.length));
  process.stdout.write(
    `\r  ${meta.externalId} — ${items.length} records, ${chapterIdFor.size} chapters, ${work.length} chunks embedded\n`,
  );
}
