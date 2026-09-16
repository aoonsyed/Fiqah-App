import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client. Uses the service-role key so it bypasses RLS —
 * never import this from a client component.
 *
 * An anon key here still connects, but every write fails with a confusing
 * "new row violates row-level security policy", so the role is checked up front.
 */
function assertServiceRoleKey(key: string): void {
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — server-side database access needs it.');
  }

  // New-style keys (sb_secret_… / sb_publishable_…) aren't JWTs; the role is in the prefix.
  if (key.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY holds a publishable key. Use the secret key (sb_secret_…) from ' +
        'Supabase → Project Settings → API Keys.',
    );
  }
  if (key.startsWith('sb_')) return;

  const payload = key.split('.')[1];
  if (!payload) return; // unrecognised format — let Supabase surface its own error

  let role: unknown;
  try {
    role = JSON.parse(Buffer.from(payload, 'base64').toString()).role;
  } catch {
    return; // undecodable payload isn't worth failing over
  }

  if (typeof role === 'string' && role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY holds a "${role}" key, not service_role. Writes will be blocked by ` +
        'row-level security. Copy the service_role key from Supabase → Project Settings → API Keys.',
    );
  }
}

let client: SupabaseClient | null = null;

/**
 * Built on first use, not at import. A build machine has no runtime secrets, so
 * validating at module scope would fail the build while collecting page data
 * rather than surfacing a clear error on the first request.
 */
function getClient(): SupabaseClient {
  if (!client) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    assertServiceRoleKey(key);
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', key);
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = Reflect.get(getClient(), prop);
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});
