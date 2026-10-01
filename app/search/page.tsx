import type { Metadata } from 'next';
import { SearchClient } from './SearchClient';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const q = (await searchParams).q?.trim();
  return {
    title: q ? `“${q.slice(0, 60)}” — search rulings` : 'Search rulings',
    description: 'Search published Shia fiqh rulings from the maraji. Understands typos and fiqh synonyms.',
    // Result lists are thin, duplicate content; the masail pages they link to are what should rank.
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? '';

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <h1 className="section-title">Search rulings</h1>
      <p className="mt-4 text-white/55">
        Understands typos and fiqh synonyms (e.g. salat, musik, kums). The best match shows each marja&apos;s answer
        where one is available.
      </p>
      <SearchClient initialQuery={q} />
    </main>
  );
}
