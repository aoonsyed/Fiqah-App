import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-14rem)] max-w-2xl place-items-center px-5 py-16 text-center sm:px-8">
      <div>
        <p className="font-display text-7xl font-bold text-gold-200/80">404</p>
        <h1 className="section-title mt-6">This page doesn&rsquo;t exist</h1>
        <p className="mt-4 text-white/50">
          The link may be mistyped, or the page may have moved. Try searching for the ruling you were after.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-gold">
            Back to home
          </Link>
          <Link href="/search" className="btn-ghost">
            Search masail
          </Link>
        </div>
      </div>
    </main>
  );
}
