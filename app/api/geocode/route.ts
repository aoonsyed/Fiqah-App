import { errorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/** Free, keyless forward geocoding with a city-focused index. */
const SEARCH_API = 'https://geocoding-api.open-meteo.com/v1/search';
/** Nominatim's policy requires an identifying User-Agent and at most ~1 req/s. */
const REVERSE_API = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = `Nur-Islamic-App/1.0 (${process.env.NEXT_PUBLIC_APP_URL || 'localhost'})`;

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  timezone?: string;
}

/**
 * GET ?q=karachi       → up to 6 matching places, for choosing a city by hand
 * GET ?lat=..&lng=..   → the place name at a position, for labelling a GPS fix
 */
export async function GET(request: NextRequest) {
  if (!rateLimit(`geocode:${getClientIp(request)}`, 30, 60)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  try {
    if (q) return NextResponse.json({ results: await search(q) });

    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    if (!isValidCoord(lat, lng)) {
      return NextResponse.json({ error: 'Provide q, or valid lat and lng' }, { status: 400 });
    }
    return NextResponse.json({ name: await reverse(lat, lng) });
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json({ error: 'Geocoding failed', message: errorMessage(error) }, { status: 502 });
  }
}

function isValidCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

async function search(q: string): Promise<GeocodeResult[]> {
  if (q.length < 2) return [];

  const url = new URL(SEARCH_API);
  url.searchParams.set('name', q.slice(0, 100));
  url.searchParams.set('count', '6');
  url.searchParams.set('format', 'json');

  const res = await fetch(url, { next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`Search service returned ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '),
    lat: r.latitude,
    lng: r.longitude,
    timezone: r.timezone,
  }));
}

async function reverse(lat: number, lng: number): Promise<string | null> {
  const url = new URL(REVERSE_API);
  url.searchParams.set('lat', lat.toFixed(2));
  url.searchParams.set('lon', lng.toFixed(2));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('zoom', '12'); // town level: 10 often stops at the district
  url.searchParams.set('accept-language', 'en');

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86_400 } });
  if (!res.ok) throw new Error(`Reverse geocoder returned ${res.status}`);

  const data = await res.json();
  const a = data.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.county ?? a.state_district;
  const parts = [city, a.state, a.country].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);

  return parts.length ? parts.join(', ') : (data.display_name ?? null);
}
