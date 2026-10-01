'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import { MarjaCompareGrid } from '@/app/components/MarjaCompareGrid';
import { RulingBadge } from '@/app/components/RulingBadge';
import { MAX_SEARCH_CHARS } from '@/lib/validate';
import type { CompareSummary, RulingType } from '@/lib/fiqh/types';

interface SearchHit {
  id: string;
  slug: string;
  questionEn: string;
  categorySlug: string;
  subcategorySlug: string;
  marjaCount: number;
  topRulingType: RulingType | null;
  /** "Ruling 1731" when the stored question is risalah ruling text. */
  label: string | null;
  heading: string;
  sources: Array<{ marja: string; source: string; site: string | null }>;
  unpublishedCount: number;
}

function categoryLabel(slug: string): string {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Results area of /search. The page shell is server-rendered; this only owns the query and results. */
export function SearchClient({ initialQuery }: { initialQuery: string }) {
  const initial = initialQuery;
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchHit[]>([]);
  // Opening /search?q=… starts in the loading state so the skeleton, not an empty page, is the first paint.
  const [loading, setLoading] = useState(!!initial.trim());
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
    // Keep the URL shareable without a server round-trip for the page shell.
    window.history.replaceState(null, '', `/search?q=${encodeURIComponent(term.trim())}`);
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
    <>
      <form
        role="search"
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
            maxLength={MAX_SEARCH_CHARS}
            aria-label="Search rulings"
            className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white focus:outline-none"
            placeholder="e.g. khums on salary, fasting while traveling"
          />
          <button type="submit" className="btn-gold !px-5 !py-2" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <p className="mt-6 text-sm text-rose-200">{error}</p>}

      {loading && (
        <ul className="mt-10 space-y-4" aria-busy="true" aria-label="Loading results">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="card h-32 animate-pulse" />
          ))}
        </ul>
      )}

      {topCompare && topCompare.fatwas.length > 0 && !loading && (
        <Reveal delay={40}>
          <MarjaCompareGrid data={topCompare} title="Best match — marja answers" maxCards={8} />
        </Reveal>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <p className="mt-10 text-center text-white/45">No matching rulings. Try fewer or different words, e.g. “khums” rather than “religious tax”.</p>
      )}

      <ul className="mt-10 space-y-4">
        {results.map((r) => (
          <li key={r.id}>
            <Link href={`/masail/${r.slug}`} className="card block p-5 hover:border-gold-300/35">
              {r.label && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-300/80">{r.label}</p>
              )}
              <p dir="auto" className={`font-medium text-white ${r.label ? 'mt-1' : ''}`}>
                {r.heading}
              </p>
              {r.sources.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {r.sources.map((src) => (
                    <li key={`${src.marja}-${src.source}`} className="text-xs text-white/60">
                      <span className="font-semibold text-white/80">{src.marja}</span>
                      <span className="text-white/30"> · </span>
                      <span className="text-emerald-350">{src.source}</span>
                      {src.site && <span className="text-white/35"> ({src.site})</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-warn">
                  ⚠ No published ruling yet — only generated placeholder answers
                </p>
              )}
              <p className="mt-2 text-xs text-white/40">
                {categoryLabel(r.categorySlug)}
                {r.sources.length > 0 && r.unpublishedCount > 0 && (
                  <> · {r.unpublishedCount} more generated placeholder answer{r.unpublishedCount === 1 ? '' : 's'}</>
                )}
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
    </>
  );
}
