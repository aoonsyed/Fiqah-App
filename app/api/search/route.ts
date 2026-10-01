import { errorMessage } from '@/lib/errors';
import { compareQuestion, getCategoryBySlug, getMarjaBySlug, listPublishedFatwaRefs } from '@/lib/fiqh/db';
import { questionHeading } from '@/lib/fiqh/question-heading';
import { describeFatwaSource, sourceLine } from '@/lib/fiqh/source-info';
import { smartSearchFiqh } from '@/lib/fiqh/retrieval';
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
    const { hits: results } = await smartSearchFiqh(q.trim(), { limit, filterCategoryId, filterMarjaId });

    const [topCompare, published] = await Promise.all([
      compareTop && results[0] ? compareQuestion(results[0].questionSlug) : null,
      listPublishedFatwaRefs(results.map((r) => r.questionId)),
    ]);

    return NextResponse.json({
      query: q,
      topCompare,
      results: results.map((r) => {
        const sources = published
          .filter((p) => p.questionId === r.questionId)
          .map((p) => {
            const source = describeFatwaSource(p.evidenceRefs, p.answerStart);
            return { marja: p.marjaName, source: sourceLine(source), site: source.site };
          });
        const { label, heading } = questionHeading(r.questionEn);
        return {
          id: r.questionId,
          slug: r.questionSlug,
          questionEn: r.questionEn,
          label,
          heading,
          sources,
          /** Answers that are generated placeholder text, not published rulings. */
          unpublishedCount: Math.max(0, r.marjaCount - sources.length),
          questionAr: r.questionAr,
          categorySlug: r.categorySlug,
          subcategorySlug: r.subcategorySlug,
          marjaCount: r.marjaCount,
          topRulingType: r.topRulingType,
        };
      }),
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
