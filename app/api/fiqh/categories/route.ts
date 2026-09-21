import { errorMessage } from '@/lib/errors';
import { listCategories, listSubcategories } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const withSubs = request.nextUrl.searchParams.get('include') === 'subcategories';
    const categories = await listCategories();
    if (!withSubs) return NextResponse.json({ categories });

    const subcategories = await listSubcategories();
    const byCat = new Map<string, typeof subcategories>();
    for (const s of subcategories) {
      const list = byCat.get(s.categoryId) ?? [];
      list.push(s);
      byCat.set(s.categoryId, list);
    }

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        subcategories: byCat.get(c.id) ?? [],
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load categories', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
