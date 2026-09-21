import { errorMessage } from '@/lib/errors';
import { compareQuestion, getCategoryBySlug, getMarjaBySlug, searchFiqhRobust } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'anon';
  return request.headers.get('x-real-ip') || 'anon';
}

export async function GET(request: NextRequest) {
  try {
    if (!rateLimit(`fiqh-search:${clientKey(request)}`, 40, 60)) {
      return NextResponse.json({ error: 'Too many searches. Try again shortly.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const categorySlug = searchParams.get('category');
    const marjaSlug = searchParams.get('marja');

    if (!q?.trim()) {
      return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 });
    }

    let filterCategoryId: string | undefined;
    let filterMarjaId: string | undefined;

    if (categorySlug) {
      const cat = await getCategoryBySlug(categorySlug);
      if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      filterCategoryId = cat.id;
    }
    if (marjaSlug) {
      const marja = await getMarjaBySlug(marjaSlug);
      if (!marja) return NextResponse.json({ error: 'Marja not found' }, { status: 404 });
      filterMarjaId = marja.id;
    }

    const compareTop = searchParams.get('compareTop') === '1';
    const results = await searchFiqhRobust(q.trim(), limit, filterCategoryId, filterMarjaId);

    let topCompare = null;
    if (compareTop && results[0]) {
      topCompare = await compareQuestion(results[0].questionSlug);
    }

    return NextResponse.json({
      query: q,
      topCompare,
      results: results.map((r) => ({
        id: r.questionId,
        slug: r.questionSlug,
        questionEn: r.questionEn,
        questionAr: r.questionAr,
        categorySlug: r.categorySlug,
        subcategorySlug: r.subcategorySlug,
        marjaCount: r.marjaCount,
        topRulingType: r.topRulingType,
      })),
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: errorMessage(error) },
      { status: 500 },
    );
  }
}
