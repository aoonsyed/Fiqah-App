import { createClient } from '@supabase/supabase-js';

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

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
assertServiceRoleKey(serviceRoleKey);

export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', serviceRoleKey);
