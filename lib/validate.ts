/** Longest search query accepted; real masail questions are far shorter. */
export const MAX_SEARCH_CHARS = 300;

/**
 * Integer query parameter clamped to [min, max]. Missing or non-numeric input
 * ("abc", "1e9", "-5") falls back or clamps instead of reaching the database as NaN.
 */
export function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * The URL if it is http(s), else undefined. Use for any href built from stored
 * or user-supplied data: React doesn't block `javascript:` URLs, which run
 * script when clicked.
 */
export function safeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}
