'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { loginUrl } from '@/lib/auth-client';

/**
 * Renders children only for a signed-in user; otherwise sends them to login and
 * brings them back here afterwards. This is the UX half — the API routes
 * enforce the same rule, so bypassing this component gets nothing.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(loginUrl(pathname));
  }, [loading, user, router, pathname]);

  if (!user) {
    return (
      <div className="grid min-h-[calc(100vh-5rem)] place-items-center">
        <div className="text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="mt-4 text-sm text-white/45">{loading ? 'Checking your session…' : 'Redirecting to sign in…'}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
