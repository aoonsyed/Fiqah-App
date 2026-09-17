import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';
import { unauthorized, verifyUserRequest } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyUserRequest(request);
    if (!user) return unauthorized();

    // Rate limit: 30 searches per minute
    if (!rateLimit(`search:${user.id}`, 30, 60)) {
      return NextResponse.json(
        { error: 'Too many searches. Please try again in a minute.' },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const book = searchParams.get('book');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!q) {
      return NextResponse.json(
        { error: 'Search query (q) is required' },
        { status: 400 },
      );
    }

    // Search hadiths by matn text (case-insensitive)
    let query = supabase
      .from('hadiths')
      .select(
        `
        id,
        hadith_number,
        matn_arabic,
        matn_translation,
        isnad_raw,
        grading,
        book_id,
        chapter_id,
        books!inner(title),
        chapters(title)
      `,
      )
      .ilike('matn_arabic', `%${q}%`)
      .limit(limit);

    if (book) {
      query = query.eq('books.title', book);
    }

    const { data, error } = await query;

    if (error) throw error;

    const results = data?.map((h: any) => ({
      id: h.id,
      hadithNumber: h.hadith_number,
      matnArabic: h.matn_arabic,
      matnTranslation: h.matn_translation,
      isnadRaw: h.isnad_raw,
      grading: h.grading,
      bookTitle: h.books.title,
      chapterTitle: h.chapters?.title ?? '',
    })) || [];

    return NextResponse.json({
      query: q,
      results: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
