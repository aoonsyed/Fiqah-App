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
  getBookByExternalId,
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

/** Retries transient failures — statement timeouts and network errors. */
export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      const wait = 2000 * 2 ** (i - 1);
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

  if (existing) {
    console.log(`  ${meta.externalId} — ${complete ? 're-importing' : 'previous run incomplete, redoing'}`);
    await withRetry('delete previous', () => deleteBook(existing.id));
  }

  const book = await withRetry('create book', () => createBook({ ...meta, ...loaded.meta, totalHadiths: 0 }));

  const chapterTitles: string[] = [];
  const categoryFor = new Map<string, string | undefined>();
  for (const r of records) {
    if (!categoryFor.has(r.chapter)) {
      categoryFor.set(r.chapter, r.category);
      chapterTitles.push(r.chapter);
    }
  }

  const chapterIdFor = new Map<string, string>();
  for (let i = 0; i < chapterTitles.length; i += HADITH_BATCH) {
    const slice = chapterTitles.slice(i, i + HADITH_BATCH);
    const saved = await withRetry('insert chapters', () =>
      batchCreateChapters(
        slice.map((title, n) => ({ bookId: book.id, title, category: categoryFor.get(title), orderIndex: i + n })),
      ),
    );
    saved.forEach((c) => chapterIdFor.set(c.title, c.id));
  }

  const withIsnad = source.isnad ?? meta.docType === 'hadith';

  // A multi-row INSERT ... RETURNING preserves order, pairing each row with its record.
  const saved: Array<{ id: string; chapterId: string; record: ImportRecord }> = [];
  for (let i = 0; i < records.length; i += HADITH_BATCH) {
    const slice = records.slice(i, i + HADITH_BATCH);
    const rows = slice.map((r, n) => {
      const isnad = withIsnad ? parseHadith(r.text) : undefined;
      return {
        bookId: book.id,
        chapterId: chapterIdFor.get(r.chapter)!,
        hadithNumber: r.number,
        isnadRaw: isnad?.isnadRaw || '',
        matnArabic: r.text,
        matnTranslation: r.translation,
        narrators: (isnad?.narrators ?? []).map((name, k) => ({
          id: `${meta.externalId}-${i + n}-${k}`,
          canonicalName: name,
          nameVariants: [name],
        })),
        gradings: r.gradings,
        language: meta.language,
        sourceUrl: r.sourceUrl,
      };
    });

    const inserted = await withRetry('insert records', () => batchCreateHadiths(rows));
    if (inserted.length !== slice.length) {
      throw new Error(`Expected ${slice.length} records back, got ${inserted.length}`);
    }
    inserted.forEach((h, n) => saved.push({ id: h.id, chapterId: h.chapterId, record: slice[n] }));
  }

  const work = saved.flatMap(({ id, chapterId, record }) => {
    const chunks = chunkText(embeddingBody(record), { maxChunkLength: MAX_CHUNK_TOKENS });
    return chunks.map((text, chunkIndex) => ({ hadithId: id, chapterId, text, chunkIndex, totalChunks: chunks.length }));
  });

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

  await withRetry('finalise', () => updateBookHadithCount(book.id, saved.length));
  process.stdout.write(
    `\r  ${meta.externalId} — ${saved.length} records, ${chapterTitles.length} chapters, ${work.length} chunks\n`,
  );
}
