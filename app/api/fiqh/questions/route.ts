import { publicErrorMessage } from '@/lib/errors';
import { listQuestions } from '@/lib/fiqh/db';
import { NextRequest, NextResponse } from 'next/server';
import { intParam } from '@/lib/validate';

export const revalidate = 120;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const subcategoryId = searchParams.get('subcategoryId') ?? undefined;
    const categorySlug = searchParams.get('category') ?? undefined;
    const limit = intParam(searchParams.get('limit'), 30, 1, 100);
    const offset = intParam(searchParams.get('offset'), 0, 0, 100_000);

    const questions = await listQuestions({ subcategoryId, categorySlug, limit, offset });
    return NextResponse.json({ questions, limit, offset });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load questions', message: publicErrorMessage(error) },
      { status: 503 },
    );
  }
}
