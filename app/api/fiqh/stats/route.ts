import { getCorpusStats } from '@/lib/fiqh/db';
import { catalogQuestionTarget, catalogSubcategoryCount, MARAJI, CATEGORIES } from '@/lib/fiqh/catalog';
import { NextResponse } from 'next/server';

export const revalidate = 300;

export async function GET() {
  const stats = await getCorpusStats();
  return NextResponse.json({
    ready: stats !== null,
    stats,
    catalog: {
      maraji: MARAJI.length,
      categories: CATEGORIES.length,
      subcategories: catalogSubcategoryCount(),
      targetQuestions: catalogQuestionTarget(),
    },
  });
}
