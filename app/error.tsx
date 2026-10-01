'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Shown when a page throws. Deliberately generic: the error's message and stack
 * stay in the console (and server logs), never on screen, since they can reveal
 * internals. `digest` is a hash Next prints next to the full server-side error.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[calc(100vh-14rem)] max-w-2xl place-items-center px-5 py-16 text-center sm:px-8">
      <div>
        <h1 className="section-title">Something went wrong</h1>
        <p className="mt-4 text-white/50">An unexpected error stopped this page from loading. Please try again.</p>
        {error.digest && <p className="mt-3 font-mono text-xs text-white/30">Reference: {error.digest}</p>}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn-gold">
            Try again
          </button>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
