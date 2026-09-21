import { errorMessage } from '@/lib/errors';
import { listPrinciples } from '@/lib/fiqh/db';
import { NextResponse } from 'next/server';

export const revalidate = 600;

export async function GET() {
  try {
    const principles = await listPrinciples();
    return NextResponse.json({ principles });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load principles', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
