'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MAX_SEARCH_CHARS } from '@/lib/validate';

const EXAMPLES = ['Khums on salary', 'Fasting while travelling', 'Cryptocurrency trading', 'Wudu with nail polish'];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const go = (q: string) => {
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="max-w-2xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(query);
        }}
      >
        <div className="flex gap-2 rounded-full border border-white/12 bg-white/[0.04] p-1.5 ring-1 ring-transparent transition focus-within:border-gold-300/30 focus-within:ring-gold-300/20">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={MAX_SEARCH_CHARS}
            aria-label="Search rulings"
            placeholder="Search rulings — e.g. khums on savings"
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 focus:outline-none"
          />
          <button type="submit" className="btn-gold !rounded-full !px-6 !py-2.5">
            Search
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/35">Try</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => go(ex)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55 transition hover:border-gold-300/40 hover:text-white"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
