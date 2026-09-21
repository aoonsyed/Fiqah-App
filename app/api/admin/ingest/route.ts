import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Hadith ingestion is disabled',
      message: 'This project is fiqh-only. Use npm run fiqh:seed to populate the corpus.',
    },
    { status: 410 },
  );
}
