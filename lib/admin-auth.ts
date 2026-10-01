/**
 * Admin authorization utility — SERVER-ONLY.
 *
 * Never import this from a client component: anything a client component
 * imports is shipped in the public JavaScript bundle, which would publish the
 * admin addresses. Client pages ask /api/admin/me instead (useIsAdmin).
 *
 * Set ADMIN_EMAILS (comma-separated) in the environment; the list below is
 * only the fallback when it is unset.
 */

const FALLBACK_ADMIN_EMAILS = ['aoonsyed72@gmail.com', 'ahmadcs170@gmail.com'];

function adminEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS?.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv?.length ? fromEnv : FALLBACK_ADMIN_EMAILS;
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
