import { publicErrorMessage } from '@/lib/errors';
import { getCategoryBySlug, getMarjaBySlug } from '@/lib/fiqh/db';
import { smartSearchFiqh } from '@/lib/fiqh/retrieval';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { intParam, MAX_SEARCH_CHARS } from '@/lib/validate';

export async function GET(request: NextRequest) {
  try {
    // Shares the quota with /api/search — same retrieval and LLM rerank behind both.
    if (!rateLimit(`fiqh-search:${getClientIp(request)}`, 40, 60)) {
      return tooManyRequests('Too many searches. Try again shortly.');
    }

    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q');
    if (!q?.trim()) {
      return NextResponse.json({ error: 'Query (q) is required' }, { status: 400 });
    }
    if (q.length > MAX_SEARCH_CHARS) {
      return NextResponse.json({ error: `Query must be under ${MAX_SEARCH_CHARS} characters` }, { status: 400 });
    }

    const limit = intParam(searchParams.get('limit'), 20, 1, 50);
    const categorySlug = searchParams.get('category');
    const marjaSlug = searchParams.get('marja');

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

    const { hits: results } = await smartSearchFiqh(q.trim(), { limit, filterCategoryId, filterMarjaId });
    return NextResponse.json({ query: q, results, count: results.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed', message: publicErrorMessage(error) },
      { status: 503 },
    );
  }
}
