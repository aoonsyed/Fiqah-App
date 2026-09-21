import { errorMessage } from '@/lib/errors';
import { listQuestions } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 120;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const subcategoryId = searchParams.get('subcategoryId') ?? undefined;
    const categorySlug = searchParams.get('category') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const questions = await listQuestions({ subcategoryId, categorySlug, limit, offset });
    return NextResponse.json({ questions, limit, offset });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load questions', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
