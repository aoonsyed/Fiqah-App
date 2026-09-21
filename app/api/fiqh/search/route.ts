import { errorMessage } from '@/lib/errors';
import { getCategoryBySlug, getMarjaBySlug, searchFiqh } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q');
    if (!q?.trim()) {
      return NextResponse.json({ error: 'Query (q) is required' }, { status: 400 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
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

    const results = await searchFiqh(q.trim(), limit, filterCategoryId, filterMarjaId);
    return NextResponse.json({ query: q, results, count: results.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
