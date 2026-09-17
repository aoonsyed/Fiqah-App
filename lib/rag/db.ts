import { supabaseAdmin as supabase } from '../supabase-server';
import type { Hadith, HadithChunk, Book, Chapter, RetrievalResult, SearchFilters } from './types';

/* ------------------------------------------------------------------ *
 * Row mapping. Postgres columns are snake_case; the app uses camelCase.
 * Every read and write must pass through these or the insert silently
 * targets columns that don't exist.
 * ------------------------------------------------------------------ */

const bookToRow = (b: Partial<Book>) => ({
  title: b.title,
  author: b.author,
  translator: b.translator,
  language: b.language,
  source_file_id: b.sourceFileId,
  source_url: b.sourceUrl,
  external_id: b.externalId,
  total_hadiths: b.totalHadiths,
  doc_type: b.docType,
});

const bookFromRow = (r: any): Book => ({
  id: r.id,
  title: r.title,
  author: r.author ?? undefined,
  translator: r.translator ?? undefined,
  language: r.language,
  sourceFileId: r.source_file_id ?? undefined,
  sourceUrl: r.source_url ?? undefined,
  externalId: r.external_id ?? undefined,
  totalHadiths: r.total_hadiths ?? 0,
  docType: r.doc_type ?? 'hadith',
  createdAt: new Date(r.created_at),
});

const chapterFromRow = (r: any): Chapter => ({
  id: r.id,
  bookId: r.book_id,
  title: r.title,
  category: r.category ?? undefined,
  orderIndex: r.order_index ?? 0,
  createdAt: new Date(r.created_at),
});

const hadithToRow = (h: Partial<Hadith>) => ({
  book_id: h.bookId,
  chapter_id: h.chapterId,
  hadith_number: h.hadithNumber,
  isnad_raw: h.isnadRaw,
  matn_arabic: h.matnArabic,
  matn_translation: h.matnTranslation,
  narrators: h.narrators,
  grading: h.gradings,
  language: h.language,
  source_url: h.sourceUrl,
  page_number: h.pageNumber,
});

const hadithFromRow = (r: any): Hadith => ({
  id: r.id,
  bookId: r.book_id,
  chapterId: r.chapter_id,
  hadithNumber: r.hadith_number,
  isnadRaw: r.isnad_raw ?? '',
  matnArabic: r.matn_arabic,
  matnTranslation: r.matn_translation ?? undefined,
  narrators: r.narrators ?? [],
  gradings: r.grading ?? undefined,
  language: r.language ?? undefined,
  sourceUrl: r.source_url ?? undefined,
  pageNumber: r.page_number ?? undefined,
  createdAt: new Date(r.created_at),
});

const chunkToRow = (c: Partial<HadithChunk>) => ({
  hadith_id: c.hadithId,
  book_id: c.bookId,
  chapter_id: c.chapterId,
  chunk_text: c.chunkText,
  embedding: c.embedding,
  chunk_index: c.chunkIndex,
  total_chunks: c.totalChunks,
});

// Books
export async function createBook(book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> {
  const { data, error } = await supabase.from('books').insert([bookToRow(book)]).select().single();

  if (error) throw error;
  return bookFromRow(data);
}

export async function updateBookHadithCount(bookId: string, total: number): Promise<void> {
  const { error } = await supabase.from('books').update({ total_hadiths: total }).eq('id', bookId);
  if (error) throw error;
}

export async function getBook(id: string): Promise<Book | null> {
  const { data, error } = await supabase.from('books').select().eq('id', id).single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return bookFromRow(data);
}

export async function listBooks(): Promise<Book[]> {
  const { data, error } = await supabase.from('books').select();

  if (error) throw error;
  return (data || []).map(bookFromRow);
}

// Chapters
export async function createChapter(chapter: Omit<Chapter, 'id' | 'createdAt'>): Promise<Chapter> {
  const { data, error } = await supabase
    .from('chapters')
    .insert([
      {
        book_id: chapter.bookId,
        title: chapter.title,
        category: chapter.category,
        order_index: chapter.orderIndex,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return chapterFromRow(data);
}

export async function batchCreateChapters(
  chapters: Array<Omit<Chapter, 'id' | 'createdAt'>>,
): Promise<Chapter[]> {
  if (chapters.length === 0) return [];

  const { data, error } = await supabase
    .from('chapters')
    .insert(
      chapters.map((c) => ({
        book_id: c.bookId,
        title: c.title,
        category: c.category,
        order_index: c.orderIndex,
      })),
    )
    .select();

  if (error) throw error;
  return (data || []).map(chapterFromRow);
}

/** Looks a book up by its upstream id so an interrupted import can resume. */
export async function getBookByExternalId(externalId: string): Promise<Book | null> {
  const { data, error } = await supabase.from('books').select().eq('external_id', externalId).maybeSingle();

  if (error) throw error;
  return data ? bookFromRow(data) : null;
}

export async function deleteBook(id: string): Promise<void> {
  // A single cascading delete of thousands of indexed vectors exceeds the
  // statement timeout, so clear the chunks in pages first.
  for (;;) {
    const { data, error } = await supabase.from('hadith_chunks').select('id').eq('book_id', id).limit(500);
    if (error) throw error;
    if (!data?.length) break;

    const del = await supabase.from('hadith_chunks').delete().in('id', data.map((r) => r.id));
    if (del.error) throw del.error;
  }

  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
}

/** Every row of a table for one book, paged past PostgREST's row cap. */
async function allRowsForBook<T>(table: string, columns: string, bookId: string): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('book_id', bookId)
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Narration ids keyed by number, so an interrupted import can pick up where it stopped. */
export async function getHadithKeys(bookId: string): Promise<Array<{ id: string; hadithNumber: string; chapterId: string }>> {
  const rows = await allRowsForBook<{ id: string; hadith_number: string; chapter_id: string }>(
    'hadiths',
    'id,hadith_number,chapter_id',
    bookId,
  );
  return rows.map((r) => ({ id: r.id, hadithNumber: r.hadith_number, chapterId: r.chapter_id }));
}

/**
 * Chunks stored per narration against how many it should have. A narration
 * interrupted mid-way has fewer than expected and must be embedded again.
 */
export async function getChunkProgress(bookId: string): Promise<Map<string, { stored: number; expected: number }>> {
  const rows = await allRowsForBook<{ hadith_id: string; total_chunks: number | null }>(
    'hadith_chunks',
    'hadith_id,total_chunks',
    bookId,
  );

  const progress = new Map<string, { stored: number; expected: number }>();
  for (const r of rows) {
    const entry = progress.get(r.hadith_id) ?? { stored: 0, expected: r.total_chunks ?? 1 };
    entry.stored++;
    progress.set(r.hadith_id, entry);
  }
  return progress;
}

export async function deleteChunksForHadiths(hadithIds: string[]): Promise<void> {
  for (let i = 0; i < hadithIds.length; i += 200) {
    const { error } = await supabase.from('hadith_chunks').delete().in('hadith_id', hadithIds.slice(i, i + 200));
    if (error) throw error;
  }
}

export async function getChaptersForBook(bookId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select()
    .eq('book_id', bookId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return (data || []).map(chapterFromRow);
}

// Hadiths
export async function createHadith(hadith: Omit<Hadith, 'id' | 'createdAt'>): Promise<Hadith> {
  const { data, error } = await supabase.from('hadiths').insert([hadithToRow(hadith)]).select().single();

  if (error) throw error;
  return hadithFromRow(data);
}

export async function batchCreateHadiths(
  hadiths: Array<Omit<Hadith, 'id' | 'createdAt'>>,
): Promise<Hadith[]> {
  if (hadiths.length === 0) return [];

  const { data, error } = await supabase.from('hadiths').insert(hadiths.map(hadithToRow)).select();

  if (error) throw error;
  return (data || []).map(hadithFromRow);
}

export async function getHadith(id: string): Promise<Hadith | null> {
  const { data, error } = await supabase.from('hadiths').select().eq('id', id).single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return hadithFromRow(data);
}

export async function getHadithsByBook(bookId: string): Promise<Hadith[]> {
  const { data, error } = await supabase.from('hadiths').select().eq('book_id', bookId);

  if (error) throw error;
  return (data || []).map(hadithFromRow);
}

// Chunks and vector search
export async function batchCreateHadithChunks(
  chunks: Array<Omit<HadithChunk, 'id' | 'createdAt'>>,
): Promise<void> {
  if (chunks.length === 0) return;

  const { error } = await supabase.from('hadith_chunks').insert(chunks.map(chunkToRow));
  if (error) throw error;
}

/** Nearest narrations to the query — at most one row per narration. */
export async function similaritySearch(
  embedding: number[],
  limit: number = 5,
  threshold: number = 0.3,
  filters: SearchFilters = {},
): Promise<RetrievalResult[]> {
  const { data, error } = await supabase.rpc('search_hadiths', {
    query_embedding: embedding,
    similarity_threshold: threshold,
    match_count: limit,
    filter_doc_type: filters.docType ?? null,
    filter_book_ids: filters.bookIds?.length ? filters.bookIds : null,
  });

  if (error) throw error;

  return (data || []).map((result: any) => ({
    hadithId: result.hadith_id,
    bookId: result.book_id,
    bookTitle: result.book_title,
    docType: result.doc_type,
    chapterTitle: result.chapter_title,
    hadithNumber: result.hadith_number,
    chunkText: result.chunk_text,
    relevanceScore: result.similarity,
    narrators: result.narrators || [],
    gradings: result.grading || undefined,
    matnArabic: result.matn_arabic,
    matnTranslation: result.matn_translation,
    sourceUrl: result.source_url,
  }));
}

export async function healthCheck(): Promise<boolean> {
  try {
    const { data } = await supabase.from('books').select('count', { count: 'exact' }).limit(1);
    return data !== null;
  } catch {
    return false;
  }
}
