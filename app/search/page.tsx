'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Reveal } from '@/app/components/Reveal';

interface SearchResult {
  id: string;
  hadithNumber: string;
  matnArabic: string;
  matnTranslation?: string;
  bookTitle: string;
  chapterTitle: string;
}

const TOPICS = ['knowledge', 'prayer', 'justice', 'patience', 'charity', 'parents'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (term: string) => {
    if (!term.trim()) return;
    setQuery(term);
    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal className="text-center">
        <p className="eyebrow">Full-text lookup</p>
        <h1 className="section-title mt-5">Search the corpus</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          Find narrations by keyword, topic, or phrase — across every indexed book.
        </p>
      </Reveal>

      <Reveal delay={100}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="mx-auto mt-12 max-w-2xl"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-2 backdrop-blur-xl transition-colors focus-within:border-gold-300/45">
            <svg viewBox="0 0 24 24" className="ml-3 h-5 w-5 shrink-0 text-white/30" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword, topic, or phrase…"
              disabled={loading}
              className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
            />
            <button type="submit" disabled={loading || !query.trim()} className="btn-gold !px-5 !py-2.5 disabled:opacity-40">
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>
      </Reveal>

      <Reveal delay={160} className="mt-6 flex flex-wrap justify-center gap-2.5">
        {TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => runSearch(t)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs capitalize text-white/55 transition hover:border-gold-300/40 hover:text-white"
          >
            {t}
          </button>
        ))}
      </Reveal>

      <div className="mt-14 space-y-4">
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center">
            <p className="font-display text-2xl text-white/70">No narrations matched</p>
            <p className="mt-2 text-sm text-white/40">
              Nothing found for &ldquo;{query}&rdquo;. Try a broader term or a different spelling.
            </p>
          </div>
        )}

        {!loading &&
          results.map((result, i) => (
            <Reveal key={result.id} delay={i * 60}>
              <article className="card p-7">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-350">
                    {result.bookTitle}
                  </span>
                  <span className="text-white/35">{result.chapterTitle}</span>
                  <span className="ml-auto font-mono text-white/30">#{result.hadithNumber}</span>
                </div>

                <p className="mt-5 font-arabic text-xl leading-loose text-gold-100/90" dir="rtl">
                  {result.matnArabic}
                </p>

                {result.matnTranslation && (
                  <p className="mt-4 text-sm leading-relaxed text-white/55">{result.matnTranslation}</p>
                )}

                <Link
                  href={`/hadith/${result.id}`}
                  className="group mt-6 inline-flex items-center gap-2 border-t border-white/10 pt-4 text-sm font-semibold text-gold-200"
                >
                  View full narration
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </article>
            </Reveal>
          ))}
      </div>

      {!searched && (
        <Reveal delay={220}>
          <div className="mt-14 card p-8">
            <h3 className="font-display text-xl font-bold text-white">Search tips</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                'Search broad topics like “knowledge” or “justice”.',
                'Partial words work — “learn” finds “learning”.',
                'Arabic and transliterated terms are both indexed.',
                'Results include the chain and grading where known.',
              ].map((tip) => (
                <li key={tip} className="flex gap-3 text-sm text-white/55">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}
    </main>
  );
}
