import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';


// Public corpus counts only — never user or conversation data.
export async function GET() {
  try {
    const [books, hadiths, chunks] = await Promise.all([
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase.from('hadiths').select('*', { count: 'exact', head: true }),
      supabase.from('hadith_chunks').select('*', { count: 'exact', head: true }),
    ]);

    if (books.error) throw books.error;

    const { data: perBook } = await supabase.from('books').select('title, total_hadiths').order('total_hadiths', {
      ascending: false,
    });

    return NextResponse.json({
      totalBooks: books.count || 0,
      totalHadiths: hadiths.count || 0,
      totalChunks: chunks.count || 0,
      books: (perBook ?? []).map((b) => ({ title: b.title, count: b.total_hadiths ?? 0 })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Corpus unavailable' },
      { status: 503 },
    );
  }
}
