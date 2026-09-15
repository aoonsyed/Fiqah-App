import { NextRequest, NextResponse } from 'next/server';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

/**
 * Calculate Qibla bearing from user location to Kaaba using great-circle distance
 */
function calculateQibla(lat: number, lng: number): number {
  const kaabaLat = (KAABA_LAT * Math.PI) / 180;
  const kaabaLng = (KAABA_LNG * Math.PI) / 180;
  const userLat = (lat * Math.PI) / 180;
  const userLng = (lng * Math.PI) / 180;

  const dLng = kaabaLng - userLng;

  const y = Math.sin(dLng) * Math.cos(kaabaLat);
  const x =
    Math.cos(userLat) * Math.sin(kaabaLat) -
    Math.sin(userLat) * Math.cos(kaabaLat) * Math.cos(dLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;

  // Normalize to 0-360
  bearing = (bearing + 360) % 360;

  return bearing;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 },
      );
    }

    const bearing = calculateQibla(lat, lng);

    return NextResponse.json({
      bearing: Math.round(bearing * 100) / 100,
      direction: getDirection(bearing),
      latitude: lat,
      longitude: lng,
    });
  } catch (error) {
    console.error('Qibla calculation error:', error);

    return NextResponse.json(
      { error: 'Failed to calculate Qibla direction' },
      { status: 500 },
    );
  }
}

function getDirection(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}
