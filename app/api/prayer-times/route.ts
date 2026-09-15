import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

const ALADHAN_API = 'https://api.aladhan.com/v1';

interface PrayerTime {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('lat') || '0');
    const longitude = parseFloat(searchParams.get('lng') || '0');
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 },
      );
    }

    // Aladhan's /timings/{date} takes a Unix timestamp in SECONDS, or DD-MM-YYYY
    const requested = date ? new Date(date) : new Date();
    if (isNaN(requested.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const url = new URL(`${ALADHAN_API}/timings/${Math.floor(requested.getTime() / 1000)}`);
    url.searchParams.set('latitude', latitude.toString());
    url.searchParams.set('longitude', longitude.toString());
    url.searchParams.set('method', '0'); // Shia Ithna-Ashari (Jafari)
    url.searchParams.set('midnightMode', '1'); // Jafari midnight mode

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`Aladhan API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data.timings) {
      throw new Error('Invalid response from Aladhan API');
    }

    const timings = data.data.timings as PrayerTime;

    // Format response for Shia practice (3 prayer times instead of 5)
    return NextResponse.json({
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      imsak: timings.Imsak,
      midnight: timings.Midnight,
      method: 'Shia Ithna-Ashari (Jafari)',
      date: date || new Date().toISOString().split('T')[0],
      latitude,
      longitude,
    });
  } catch (error) {
    console.error('Prayer times error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch prayer times',
        message: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
