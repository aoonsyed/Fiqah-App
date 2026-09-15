/**
 * Turns any thrown value into a readable message.
 *
 * Supabase/PostgREST rejects with a plain object ({ message, code, details, hint }),
 * not an Error — so `String(err)` on it yields "[object Object]" and hides the
 * actual cause. This unwraps the shapes we actually encounter.
 */
export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    const code = typeof e.code === 'string' ? ` [${e.code}]` : '';

    if (parts.length > 0) return parts.join(' — ') + code;

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return String(error ?? 'Unknown error');
}
