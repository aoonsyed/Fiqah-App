import { errorMessage } from '@/lib/errors';
import { getQuestionBySlug, listFatwasForQuestion } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 120;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const question = await getQuestionBySlug(slug);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    const fatwas = await listFatwasForQuestion(question.id);
    return NextResponse.json({ question, fatwas });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load question', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
