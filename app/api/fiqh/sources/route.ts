import { DEEPEN_IMPORT_HINTS, MARAJI_SOURCE_CATALOG } from '@/lib/fiqh/maraji-sources';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    catalog: MARAJI_SOURCE_CATALOG,
    deepen: DEEPEN_IMPORT_HINTS,
  });
}
