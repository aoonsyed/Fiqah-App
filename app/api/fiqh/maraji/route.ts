import { errorMessage } from '@/lib/errors';
import { listMaraji } from '@/lib/fiqh/db';
import { NextResponse } from 'next/server';

export const revalidate = 600;

export async function GET() {
  try {
    const maraji = await listMaraji();
    return NextResponse.json({ maraji });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load maraji', message: errorMessage(error) },
      { status: 503 },
    );
  }
}
