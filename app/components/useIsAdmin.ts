'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { authFetch } from '@/lib/auth-client';

/**
 * Asks the server whether the signed-in user is an admin. The whitelist stays
 * server-side; the API routes enforce it regardless of what this returns.
 */
export function useIsAdmin(): { authorized: boolean; checking: boolean } {
  const { user, loading } = useAuth();
  const [result, setResult] = useState<{ userId: string; admin: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetch('/api/admin/me')
      .then((res) => res.ok)
      .catch(() => false)
      .then((admin) => {
        if (!cancelled) setResult({ userId: user.id, admin });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return { authorized: false, checking: true };
  if (!user) return { authorized: false, checking: false };
  if (result?.userId !== user.id) return { authorized: false, checking: true };
  return { authorized: result.admin, checking: false };
}
