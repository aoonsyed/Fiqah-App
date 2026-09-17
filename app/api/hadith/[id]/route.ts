import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-server';
import { unauthorized, verifyUserRequest } from '@/lib/auth-server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Full narration for the source viewer: text, chain, translation and gradings. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyUserRequest(request))) return unauthorized();

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'Invalid hadith id' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('hadiths')
      .select(
        'id, hadith_number, isnad_raw, matn_arabic, matn_translation, grading, source_url, books(title, doc_type), chapters(title)',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Hadith not found' }, { status: 404 });

    const book = data.books as unknown as { title: string; doc_type: string } | null;
    const chapter = data.chapters as unknown as { title: string } | null;

    return NextResponse.json({
      id: data.id,
      hadithNumber: data.hadith_number,
      isnadRaw: data.isnad_raw ?? '',
      matnArabic: data.matn_arabic,
      matnTranslation: data.matn_translation ?? undefined,
      gradings: data.grading ?? undefined,
      sourceUrl: data.source_url ?? undefined,
      bookTitle: book?.title ?? '',
      docType: book?.doc_type ?? 'hadith',
      chapterTitle: chapter?.title ?? '',
    });
  } catch (error) {
    console.error('Hadith lookup error:', error);
    return NextResponse.json({ error: 'Failed to load hadith', message: errorMessage(error) }, { status: 500 });
  }
}
