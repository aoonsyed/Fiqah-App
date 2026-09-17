import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export interface IpLocation {
  lat: number;
  lng: number;
  name: string;
  timezone?: string;
}

/**
 * Approximate location of the caller's IP address — city level at best, and it
 * follows a VPN. Used as the default because it needs no permission prompt.
 *
 * Two keyless providers, tried in order, since free tiers go down or throttle.
 */
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  if (!rateLimit(`ip-location:${clientIp}`, 20, 60)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }

  // In local dev the caller is loopback; asking the provider without an IP makes
  // it use this server's public address, which is then the same machine's.
  const ip = isPublicIp(clientIp) ? clientIp : '';

  for (const provider of [ipwho, geojs]) {
    try {
      const location = await provider(ip);
      if (location) return NextResponse.json(location);
    } catch (error) {
      console.warn(`IP location via ${provider.name} failed:`, error);
    }
  }

  return NextResponse.json({ error: 'Could not determine location from IP' }, { status: 502 });
}

function isPublicIp(ip: string | null | undefined): ip is string {
  if (!ip || ip === 'unknown') return false;
  return !/^(::1$|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd|fe80:|localhost)/i.test(ip);
}

const joinName = (...parts: Array<string | undefined>) =>
  parts.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

async function ipwho(ip: string): Promise<IpLocation | null> {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`status ${res.status}`);

  const d = await res.json();
  if (!d.success || typeof d.latitude !== 'number') return null;

  return {
    lat: d.latitude,
    lng: d.longitude,
    name: joinName(d.city, d.region, d.country),
    timezone: d.timezone?.id,
  };
}

async function geojs(ip: string): Promise<IpLocation | null> {
  const url = ip ? `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json` : 'https://get.geojs.io/v1/ip/geo.json';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`status ${res.status}`);

  const d = await res.json();
  const lat = parseFloat(d.latitude);
  const lng = parseFloat(d.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, name: joinName(d.city, d.region, d.country), timezone: d.timezone };
}
