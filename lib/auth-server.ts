import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from './supabase-server';

export interface RequestUser {
  id: string;
  email: string;
}

/**
 * Verifies the caller's Supabase access token (sent as `Authorization: Bearer`).
 * Sessions live in the browser's storage, not cookies, so the token must be
 * sent explicitly — see authFetch in lib/auth-client.ts.
 * Server-only — never import this from a client component.
 */
export async function verifyUserRequest(request: Request): Promise<RequestUser | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data?.user) return null;

  return { id: data.user.id, email: data.user.email ?? '' };
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Sign in required', code: 'UNAUTHORIZED' }, { status: 401 });
