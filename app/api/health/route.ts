import { errorMessage } from '@/lib/errors';
import { fiqhTablesReady, getCorpusStats } from '@/lib/fiqh/db';
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
  try {
    const tables = await fiqhTablesReady();
    const stats = tables ? await getCorpusStats() : null;

    return NextResponse.json({
      status: tables ? 'ok' : 'degraded',
      database: tables ? 'connected' : 'disconnected',
      fiqh: {
        schema: tables,
        questions: stats?.questions ?? 0,
        fatwas: stats?.fatwas ?? 0,
      },
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
