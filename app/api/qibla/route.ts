import { NextRequest, NextResponse } from 'next/server';
import { compassDirection, distanceToKaabaKm, qiblaBearing } from '@/lib/qibla';

/**
 * Kept for non-browser callers. The app itself computes the bearing client-side
 * from the live position, so it updates instantly as you move.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const bearing = qiblaBearing(lat, lng);

  return NextResponse.json({
    bearing: Math.round(bearing * 100) / 100,
    direction: compassDirection(bearing),
    distanceKm: Math.round(distanceToKaabaKm(lat, lng)),
    latitude: lat,
    longitude: lng,
  });
}
