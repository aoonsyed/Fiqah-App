import { getCorpusStats } from '@/lib/fiqh/db';
import { catalogQuestionTarget, catalogSubcategoryCount, CATEGORIES, MARAJI } from '@/lib/fiqh/catalog';
import { NextResponse } from 'next/server';

export const revalidate = 300;

/** Public fiqh corpus counts only. */
export async function GET() {
  try {
    const stats = await getCorpusStats();

    return NextResponse.json({
      ready: stats !== null && (stats.questions ?? 0) > 0,
      stats,
      catalog: {
        maraji: MARAJI.length,
        categories: CATEGORIES.length,
        subcategories: catalogSubcategoryCount(),
        targetQuestions: catalogQuestionTarget(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stats unavailable' },
      { status: 503 },
    );
  }
}
