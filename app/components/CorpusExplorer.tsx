'use client';

import { useMemo, useState } from 'react';

export interface CorpusBook {
  title: string;
  count: number;
  docType?: string;
  author?: string | null;
}

type Filter = 'all' | 'hadith' | 'masail';
type SortKey = 'count' | 'title';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Everything' },
  { key: 'hadith', label: 'Hadith collections' },
  { key: 'masail', label: 'Fiqh rulings' },
];

/** Ranked colour ramp: gold for the largest works, cooling down the list. */
const RAMP = [
  'from-gold-300 to-gold-500',
  'from-emerald-350 to-emerald-800',
  'from-sky-400 to-sky-700',
  'from-violet-400 to-violet-700',
  'from-rose-400 to-rose-700',
  'from-amber-400 to-amber-700',
];

const COLLAPSED_ROWS = 8;

/**
 * The library, browsable: every book ranked by size, with a share-of-corpus
 * bar you can search, filter and sort. Replaces a static six-bar chart that
 * showed the same six books to everyone.
 */
export function CorpusExplorer({ books }: { books: CorpusBook[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('count');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return books
      .filter((b) => b.count > 0)
      .filter((b) => (filter === 'all' ? true : (b.docType ?? 'hadith') === filter))
      .filter((b) => (term ? b.title.toLowerCase().includes(term) : true))
      .sort((a, b) => (sort === 'count' ? b.count - a.count : a.title.localeCompare(b.title)));
  }, [books, filter, sort, query]);

  const total = rows.reduce((sum, b) => sum + b.count, 0);
  const max = Math.max(...rows.map((b) => b.count), 1);
  // Searching should show every match, not the first handful.
  const visible = expanded || query.trim() ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <div className="card p-6 hover:!translate-y-0 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-bold text-white">
            {total.toLocaleString()} narrations
          </h3>
          <p className="mt-1 text-xs text-white/40">
            across {rows.length} {rows.length === 1 ? 'book' : 'books'} · counted from the index, not estimated
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="corpus-search">
            Search books
          </label>
          <input
            id="corpus-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books…"
            className="w-44 rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-gold-300/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSort((s) => (s === 'count' ? 'title' : 'count'))}
            className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/65 transition hover:border-gold-300/45 hover:text-white"
            title="Change ordering"
          >
            {sort === 'count' ? 'Largest first' : 'A → Z'}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? 'border-gold-300/50 bg-gold-300/12 text-gold-200'
                : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">No books match “{query}”.</p>
      ) : (
        <ul className="mt-6 space-y-1">
          {visible.map((book, i) => {
            const share = total ? (book.count / total) * 100 : 0;
            const isOpen = selected === book.title;

            return (
              <li key={book.title}>
                <button
                  type="button"
                  onClick={() => setSelected(isOpen ? null : book.title)}
                  aria-expanded={isOpen}
                  className={`group w-full rounded-xl px-3 py-2.5 text-left transition ${
                    isOpen ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-white/25">
                      {sort === 'count' ? i + 1 : ''}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/80 group-hover:text-white">
                      {book.title}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white/85">
                      {book.count.toLocaleString()}
                    </span>
                    <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-white/30">
                      {share < 1 ? '<1' : share.toFixed(0)}%
                    </span>
                  </div>

                  {/* Bar width is share of the largest book, so differences read clearly */}
                  <div className="mt-2 ml-8 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${RAMP[i % RAMP.length]} transition-[width] duration-700 ease-out`}
                      style={{ width: `${Math.max((book.count / max) * 100, 2)}%` }}
                    />
                  </div>

                  {isOpen && (
                    <div className="ml-8 mt-3 space-y-1 border-l border-white/10 pl-4 text-xs text-white/45">
                      {book.author && <p>{book.author}</p>}
                      <p>
                        {(book.docType ?? 'hadith') === 'masail' ? 'Numbered fiqh rulings' : 'Hadith collection'} ·{' '}
                        {book.count.toLocaleString()} entries · {share.toFixed(1)}% of the filtered corpus
                      </p>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!query.trim() && rows.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="btn-ghost mt-6 w-full !py-2.5 text-xs"
        >
          {expanded ? 'Show top 8' : `Show all ${rows.length} books`}
        </button>
      )}
    </div>
  );
}
