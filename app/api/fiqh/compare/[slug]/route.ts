import { errorMessage } from '@/lib/errors';
import { compareQuestion } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 120;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const comparison = await compareQuestion(slug);
    if (!comparison) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    return NextResponse.json(comparison);
  } catch (error) {
    return NextResponse.json(
      { error: 'Comparison failed', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
