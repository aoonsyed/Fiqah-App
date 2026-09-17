'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CitationModal } from './CitationModal';
import { AuthRequiredError, authFetch, loginUrl } from '@/lib/auth-client';

/**
 * Opens the full narration (text, chain, translation, gradings) for a hadith id
 * in a modal. Returns `open(id)` and the modal element to render.
 */
export function useHadithViewer() {
  const router = useRouter();
  const pathname = usePathname();
  const [hadith, setHadith] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (id: string | undefined) => {
      if (!id) return;
      setLoadingId(id);
      setError(null);
      try {
        const res = await authFetch(`/api/hadith/${id}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'This narration is no longer in the library.' : 'Could not load this narration.');
        setHadith(await res.json());
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          router.push(loginUrl(pathname));
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not load this narration.');
      } finally {
        setLoadingId(null);
      }
    },
    [router, pathname],
  );

  const close = useCallback(() => setHadith(null), []);

  const viewer = (
    <>
      <CitationModal hadith={hadith} onClose={close} />
      {loadingId && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/12 bg-night-800/95 px-4 py-2 text-xs text-white/70 shadow-xl backdrop-blur">
          Opening narration…
        </div>
      )}
      {error && (
        <button
          type="button"
          onClick={() => setError(null)}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-red-400/30 bg-red-950/90 px-4 py-2 text-xs text-red-200 shadow-xl"
        >
          {error} · Dismiss
        </button>
      )}
    </>
  );

  return { open, loadingId, viewer };
}
