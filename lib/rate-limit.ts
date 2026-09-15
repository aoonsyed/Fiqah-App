/**
 * Simple rate limiter using in-memory storage
 * For production, use Upstash Redis or similar
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const limitStore = new Map<string, RateLimitEntry>();

export function rateLimit(key: string, limit: number = 10, windowSeconds: number = 60): boolean {
  const now = Date.now();
  const entry = limitStore.get(key);

  if (!entry || now > entry.resetTime) {
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
 * Get client IP for rate limiting
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const clientIp = request.headers.get('x-client-ip');
  if (clientIp) return clientIp;

  return 'unknown';
}
