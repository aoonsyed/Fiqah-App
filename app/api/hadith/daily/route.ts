import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { getHadithsByBook } from '@/lib/rag/db';

export const revalidate = 86400; // Cache for 24 hours

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const secret = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && !validateCronSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date for deterministic selection
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // For now, return a placeholder daily hadith message
    // In production, this would:
    // 1. Query hadiths table
    // 2. Select one deterministically based on date hash
    // 3. Optional: send via email/push notification

    return NextResponse.json({
      success: true,
      message: 'Daily hadith scheduled',
      date: dateStr,
      hadith: null, // TODO: Select actual hadith from DB
    });
  } catch (error) {
    console.error('Daily hadith error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch daily hadith',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}

function validateCronSecret(secret: string | null): boolean {
  if (!secret || !process.env.CRON_SECRET) return false;
  return secret === `Bearer ${process.env.CRON_SECRET}`;
}
