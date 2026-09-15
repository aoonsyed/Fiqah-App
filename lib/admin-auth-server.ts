import { supabaseAdmin as supabase } from './supabase-server';
import { isAdminEmail } from './admin-auth';


/**
 * Verifies the caller's Supabase access token and that they're on the admin
 * whitelist. Returns the admin's email, or null if the request isn't authorized.
 * Server-only — never import this from a client component.
 */
export async function verifyAdminRequest(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const { data, error } = await supabase.auth.getUser(header.slice(7));
  const email = data?.user?.email;

  if (error || !email || !isAdminEmail(email)) return null;
  return email;
}
