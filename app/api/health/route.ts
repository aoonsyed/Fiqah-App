import { errorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/rag/db';

export const revalidate = 60; // Cache for 1 minute

export async function GET() {
  try {
    const dbHealthy = await healthCheck();

    return NextResponse.json({
      status: dbHealthy ? 'ok' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'error',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
