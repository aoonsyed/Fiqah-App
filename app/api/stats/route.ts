import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Counts change only on ingestion, and an exact count over 126k rows is slow.
export const revalidate = 300;

/**
 * Public corpus counts only — never user or conversation data.
 *
 * A failed count returns null, not 0: under load an exact count can exceed the
 * statement timeout, and reporting zero made the homepage announce an empty
 * corpus while the books were plainly there.
 */
export async function GET() {
  try {
    const { data: perBook, error: booksError } = await supabase
      .from('books')
      .select('title, total_hadiths')
      .order('total_hadiths', { ascending: false });
    if (booksError) throw booksError;

    const books = perBook ?? [];
    // Summing the per-book totals avoids a full-table count of `hadiths`.
    const totalHadiths = books.reduce((sum, b) => sum + (b.total_hadiths ?? 0), 0);

    const chunks = await supabase.from('hadith_chunks').select('*', { count: 'exact', head: true });
    if (chunks.error) console.error('Chunk count failed:', chunks.error.message);

    return NextResponse.json({
      totalBooks: books.length,
      totalHadiths,
      totalChunks: chunks.error ? null : (chunks.count ?? 0),
      books: books.map((b) => ({ title: b.title, count: b.total_hadiths ?? 0 })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Corpus unavailable' },
      { status: 503 },
    );
  }
}
