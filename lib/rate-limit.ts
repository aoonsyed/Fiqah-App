/**
 * Fixed-window rate limiter using in-memory storage.
 *
 * Counts are per server instance, so on serverless hosting this is a
 * best-effort brake rather than a hard global quota. For a strict limit across
 * instances, back it with Upstash Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limitStore = new Map<string, RateLimitEntry>();

/** Bound memory: a flood of distinct keys (spoofed IPs) can't grow the map forever. */
const MAX_KEYS = 10_000;

function prune(now: number) {
  for (const [key, entry] of limitStore) {
    if (now > entry.resetTime) limitStore.delete(key);
  }
  // Still full of live windows: drop the oldest insertions.
  if (limitStore.size >= MAX_KEYS) {
    const excess = limitStore.size - MAX_KEYS + 1;
    let i = 0;
    for (const key of limitStore.keys()) {
      if (i++ >= excess) break;
      limitStore.delete(key);
    }
  }
}

export function rateLimit(key: string, limit: number = 10, windowSeconds: number = 60): boolean {
  const now = Date.now();
  const entry = limitStore.get(key);

  if (!entry || now > entry.resetTime) {
    if (limitStore.size >= MAX_KEYS) prune(now);
    // New window or expired
    limitStore.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return true;
  }

  if (entry.count < limit) {
    entry.count++;
    return true;
  }

  return false;
}

export function getRateLimitInfo(key: string, limit: number = 10, windowSeconds: number = 60) {
  const entry = limitStore.get(key);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return { remaining: limit, resetTime: now + windowSeconds * 1000 };
  }

  return {
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP for rate limiting.
 *
 * x-real-ip is set by the hosting proxy (Vercel) and can't be supplied by the
 * caller. The first x-forwarded-for entry can — a client sends its own value
 * and the proxy appends — so it is only a fallback for hosts without x-real-ip.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return 'unknown';
}

export function tooManyRequests(message = 'Too many requests. Please try again in a minute.') {
  return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': '60' } });
}
