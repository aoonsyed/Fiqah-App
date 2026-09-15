import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import {
  extractTextFromFile,
  letterRatio,
  MIN_LETTER_RATIO,
  chunkText,
  parseHadith,
  parseMasail,
  detectDocType,
  createBook,
  createChapter,
  batchCreateHadiths,
  updateBookHadithCount,
  batchCreateHadithChunks,
  embedDocuments,
} from '@/lib/rag';
import type { DocType } from '@/lib/rag/types';
import type { ParsedHadith } from '@/lib/rag/parser';
import { verifyAdminRequest } from '@/lib/admin-auth-server';

interface IngestEntry {
  number?: string;
  body: string;
  parsed?: ParsedHadith;
}

export const maxDuration = 300; // 5 minutes for Vercel Hobby plan

/** Rows per database insert — keeps payloads well under PostgREST's limits. */
const DB_BATCH = 500;

/** Chunks embedded + stored per cycle. Bounds memory and makes progress durable. */
const EMBED_SLICE = 256;

/**
 * Serverless platforms kill the request at maxDuration, so stop just short and
 * report partial progress. Running locally there's no such limit — cutting a
 * long ingest short there would be self-inflicted.
 */
const TIME_BUDGET_MS = process.env.VERCEL ? 270_000 : Number.POSITIVE_INFINITY;

/** Narration blocks in a hadith collection, split on numbering or hadith markers. */
function splitHadiths(text: string): string[] {
  return text
    .split(/\n(?=\s*(?:\d+\s*[.\-)]|Hadith\b|حديث|رقم))/i)
    .map((block) => block.trim())
    .filter((block) => block.length >= 50);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdminRequest(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bookTitle = formData.get('bookTitle') as string;
    const author = formData.get('author') as string;
    const language = ((formData.get('language') as string) || 'ar') as 'ar' | 'en' | 'ur';
    const requestedType = formData.get('docType') as string | null;

    if (!file || !bookTitle) {
      return NextResponse.json({ error: 'File and bookTitle are required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const extracted = await extractTextFromFile(Buffer.from(buffer), file.name);

    if (!extracted.text || extracted.text.trim().length < 100) {
      return NextResponse.json(
        { error: 'No extractable text found. Scanned PDFs need OCR before ingestion.' },
        { status: 422 },
      );
    }

    // Text came out, but it may be glyph codes rather than readable script —
    // indexing that produces a corpus that looks fine and can never be searched.
    const ratio = letterRatio(extracted.text);
    if (ratio < MIN_LETTER_RATIO) {
      return NextResponse.json(
        {
          error: 'Extracted text is not readable',
          message:
            `Only ${(ratio * 100).toFixed(0)}% of the extracted characters are letters, so this PDF's ` +
            `fonts almost certainly use a non-Unicode encoding (common for Urdu typesetting). ` +
            `Indexing it would produce an unsearchable corpus. Run the file through OCR ` +
            `(e.g. ocrmypdf with -l urd+ara) or supply a text-based source, then re-upload.`,
        },
        { status: 422 },
      );
    }

    const docType: DocType =
      requestedType === 'hadith' || requestedType === 'masail'
        ? requestedType
        : detectDocType(extracted.text);

    // Each entry becomes one record: a narration, or a numbered ruling.
    const entries: IngestEntry[] =
      docType === 'masail'
        ? parseMasail(extracted.text).map((m) => ({ number: m.number, body: m.text }))
        : splitHadiths(extracted.text).map((block) => {
            const parsed = parseHadith(block);
            return { parsed, number: parsed.hadithNumber, body: parsed.matn || block };
          });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: `Could not find any ${docType === 'masail' ? 'rulings' : 'narrations'} in this file.` },
        { status: 422 },
      );
    }

    const book = await createBook({
      title: bookTitle,
      author,
      language,
      docType,
      totalHadiths: 0,
    });

    const chapter = await createChapter({
      bookId: book.id,
      title: docType === 'masail' ? 'Rulings' : 'Main Collection',
      orderIndex: 0,
    });

    const deadline = Date.now() + TIME_BUDGET_MS;

    // Insert the records in batches. A single multi-row INSERT ... RETURNING
    // gives rows back in insertion order, which is what pairs each saved record
    // with the entry it came from.
    const records = [];
    for (let i = 0; i < entries.length; i += DB_BATCH) {
      const slice = entries.slice(i, i + DB_BATCH);
      const saved = await batchCreateHadiths(
        slice.map((entry, n) => ({
          bookId: book.id,
          chapterId: chapter.id,
          hadithNumber: entry.number || String(i + n + 1),
          isnadRaw: entry.parsed?.isnadRaw || '',
          matnArabic: entry.body,
          narrators: (entry.parsed?.narrators ?? []).map((name, k) => ({
            id: `${book.id}-${i + n}-${k}`,
            canonicalName: name,
            nameVariants: [name],
          })),
          gradings: entry.parsed?.grading ? [{ grade: entry.parsed.grading }] : undefined,
          language,
        })),
      );

      if (saved.length !== slice.length) {
        throw new Error(`Expected ${slice.length} records back, got ${saved.length}`);
      }
      records.push(...saved);
    }

    // Flatten every chunk across every record into one work list, so embedding
    // runs in full batches instead of a tiny batch per entry.
    const work = records.flatMap((record, i) => {
      const chunks = chunkText(entries[i].body, { maxChunkLength: 500 });
      return chunks.map((text, idx) => ({
        hadithId: record.id,
        text,
        chunkIndex: idx,
        totalChunks: chunks.length,
      }));
    });

    let chunksIndexed = 0;
    let timedOut = false;

    for (let i = 0; i < work.length; i += EMBED_SLICE) {
      if (Date.now() > deadline) {
        timedOut = true;
        break;
      }

      const slice = work.slice(i, i + EMBED_SLICE);
      const embeddings = await embedDocuments(slice.map((w) => w.text));

      await batchCreateHadithChunks(
        slice.map((w, j) => ({
          hadithId: w.hadithId,
          bookId: book.id,
          chapterId: chapter.id,
          chunkText: w.text,
          embedding: embeddings[j],
          chunkIndex: w.chunkIndex,
          totalChunks: w.totalChunks,
        })),
      );

      chunksIndexed += slice.length;
    }

    await updateBookHadithCount(book.id, records.length);

    const noun = docType === 'masail' ? 'rulings' : 'narrations';
    return NextResponse.json({
      success: true,
      bookId: book.id,
      docType,
      hadiths_created: records.length,
      chunks_indexed: chunksIndexed,
      chunks_total: work.length,
      partial: timedOut,
      message: timedOut
        ? `Ran out of time: embedded ${chunksIndexed} of ${work.length} chunks across ${records.length} ${noun}. ` +
          `The text is saved but search will only find the embedded portion — delete the book and re-ingest to finish.`
        : `Indexed ${records.length} ${noun} (${chunksIndexed} chunks) from ${bookTitle}`,
    });
  } catch (error) {
    console.error('Ingestion error:', error);

    return NextResponse.json(
      {
        error: 'Ingestion failed',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
