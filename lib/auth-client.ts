'use client';

import { supabase } from '@/app/components/AuthProvider';

export class AuthRequiredError extends Error {
  constructor() {
    super('Sign in required');
    this.name = 'AuthRequiredError';
  }
}

/**
 * fetch with the signed-in user's access token attached. Protected API routes
 * reject requests without it, so library features can't be used signed out.
 * Throws AuthRequiredError when there's no session or the server rejects it.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  // getSession refreshes an expired access token before returning it.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AuthRequiredError();

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) throw new AuthRequiredError();
  return res;
}

/** Login URL that returns the user to the current page afterwards. */
export function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
