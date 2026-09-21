import { errorMessage } from '@/lib/errors';
import { getCategoryBySlug, listSubcategories } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const categorySlug = request.nextUrl.searchParams.get('category');
    let categoryId: string | undefined;
    if (categorySlug) {
      const cat = await getCategoryBySlug(categorySlug);
      if (!cat) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      categoryId = cat.id;
    }
    const subcategories = await listSubcategories(categoryId);
    return NextResponse.json({ subcategories });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load subcategories', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
