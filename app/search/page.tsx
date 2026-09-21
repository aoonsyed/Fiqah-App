'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Reveal } from '@/app/components/Reveal';
import { MarjaCompareGrid } from '@/app/components/MarjaCompareGrid';
import { RulingBadge } from '@/app/components/RulingBadge';
import type { CompareSummary, RulingType } from '@/lib/fiqh/types';

interface SearchHit {
  id: string;
  slug: string;
  questionEn: string;
  categorySlug: string;
  subcategorySlug: string;
  marjaCount: number;
  topRulingType: RulingType | null;
}

function SearchInner() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topCompare, setTopCompare] = useState<CompareSummary | null>(null);

  useEffect(() => {
    if (initial) runSearch(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  async function runSearch(term: string) {
    if (!term.trim()) return;
    setQuery(term);
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&compareTop=1&limit=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      setResults(data.results ?? []);
      setTopCompare(data.topCompare ?? null);
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <Reveal>
        <Link href="/" className="text-sm text-gold-200 hover:underline">
          ← Home
        </Link>
        <h1 className="section-title mt-6">Search masail</h1>
        <p className="mt-4 text-white/50">
          Search understands typos and fiqh synonyms (e.g. salat, musik, kums). Top match shows marja answers when available.
        </p>
      </Reveal>

      <form
        className="mt-10"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div className="flex gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white focus:outline-none"
            placeholder="e.g. khums on salary, fasting while traveling"
          />
          <button type="submit" className="btn-gold !px-5 !py-2" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <p className="mt-6 text-sm text-rose-200">{error}</p>}

      {topCompare && topCompare.fatwas.length > 0 && !loading && (
        <Reveal delay={40}>
          <MarjaCompareGrid data={topCompare} title="Best match — marja answers" maxCards={8} />
        </Reveal>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <p className="mt-10 text-center text-white/45">No matches — seed the corpus or try another phrase.</p>
      )}

      <ul className="mt-10 space-y-4">
        {results.map((r) => (
          <li key={r.id}>
            <Link href={`/masail/${r.slug}`} className="card block p-5 hover:border-gold-300/35">
              <p className="font-medium text-white">{r.questionEn}</p>
              <p className="mt-2 text-xs text-white/40">
                {r.categorySlug} / {r.subcategorySlug} · {r.marjaCount} marja answers
              </p>
              {r.topRulingType && (
                <div className="mt-3">
                  <RulingBadge type={r.topRulingType} />
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-5 py-16 animate-pulse">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}
