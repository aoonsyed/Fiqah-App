'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CountUp, Reveal } from '@/app/components/Reveal';
import { WorshipPanel } from '@/app/components/WorshipPanel';
import type { FiqhCategory, Marja } from '@/lib/fiqh/types';
import { CATEGORIES, MARAJI } from '@/lib/fiqh/catalog';

interface FiqhStatsResponse {
  ready: boolean;
  stats: {
    questions: number;
    fatwas: number;
    maraji: number;
    subcategories: number;
  } | null;
}

function shortMarja(name: string): string {
  return name
    .replace(/^Ayatollah\s+/i, '')
    .replace(/^Allamah\s+/i, '')
    .replace(/^Sayyid\s+/i, '')
    .replace(/^Grand\s+/i, '');
}

export function FiqhHomeHub() {
  const [stats, setStats] = useState<FiqhStatsResponse | null>(null);
  const [categories, setCategories] = useState<FiqhCategory[]>([]);
  const [maraji, setMaraji] = useState<Marja[]>([]);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/fiqh/categories').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/fiqh/maraji').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([s, c, m]) => {
        setStats(s);
        setCategories(c?.categories?.length ? c.categories : fallbackCategories());
        setMaraji(m?.maraji?.length ? m.maraji : fallbackMaraji());
      })
      .catch(() => {
        setCategories(fallbackCategories());
        setMaraji(fallbackMaraji());
      })
      .finally(() => setReady(true));
  }, []);

  const topics = useMemo(() => categories.filter((c) => c.slug !== 'usul'), [categories]);
  const dbReady = stats?.ready && (stats.stats?.questions ?? 0) > 0;

  return (
    <main>
      {/* Hero — brand + one action */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
        <Reveal>
          <p className="eyebrow">Comparative Shia fiqh</p>
          <h1 className="mt-4 font-display text-6xl font-bold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
            Fiqah
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/55">
            Ask one question. Read how multiple maraji answer — plus Qibla and salah for your place.
          </p>
        </Reveal>

        <Reveal delay={60}>
          <form
            className="mt-10 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
            }}
          >
            <label className="sr-only" htmlFor="home-search">
              Search masail
            </label>
            <div className="flex overflow-hidden rounded-md border border-white/15 bg-night-800 shadow-sm focus-within:border-emerald-500/50">
              <input
                id="home-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. khums on salary, music, fasting while traveling"
                className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button type="submit" className="bg-emerald-800 px-5 text-sm font-semibold text-[var(--on-accent)] transition hover:bg-emerald-500">
                Search
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/chat" className="font-medium text-emerald-800 underline-offset-4 hover:underline">
              Or ask in chat →
            </Link>
          </div>
        </Reveal>

        {ready && dbReady && stats?.stats && (
          <Reveal delay={100}>
            <p className="mt-12 text-sm text-white/40">
              <span className="font-semibold tabular-nums text-white/70">
                <CountUp value={stats.stats.fatwas} />
              </span>{' '}
              fatwas ·{' '}
              <span className="font-semibold tabular-nums text-white/70">
                <CountUp value={stats.stats.questions} />
              </span>{' '}
              questions ·{' '}
              <span className="font-semibold tabular-nums text-white/70">{stats.stats.maraji}</span> maraji
            </p>
          </Reveal>
        )}
      </section>

      {/* Topics + Maraji — editorial two-column, no carousel chrome */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-white">Topics</h2>
            <div className="ink-rule mt-3" />
            <ul className="mt-6 divide-y divide-white/10">
              {topics.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/topics/${c.slug}`}
                    className="group flex items-baseline justify-between gap-4 py-3.5 transition hover:bg-white/[0.03]"
                  >
                    <span className="font-medium text-white/85 group-hover:text-emerald-800">{c.nameEn}</span>
                    <span className="shrink-0 text-xs text-white/30 transition group-hover:text-emerald-800">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="font-display text-2xl font-bold text-white">Maraji</h2>
            <div className="ink-rule mt-3" />
            <ul className="mt-6 columns-1 gap-x-8 sm:columns-2">
              {maraji.map((m) => (
                <li key={m.slug} className="mb-3 break-inside-avoid">
                  <Link
                    href={`/search?q=${encodeURIComponent(shortMarja(m.nameEn).split(' ').slice(-1)[0] ?? m.slug)}`}
                    className="text-sm text-white/60 transition hover:text-emerald-800"
                  >
                    {shortMarja(m.nameEn)}
                    <span className="ml-1.5 text-[10px] uppercase tracking-wider text-white/30">{m.era}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Worship — separate band */}
      <section className="border-y border-white/10 bg-night-800/60">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <Reveal>
            <WorshipPanel variant="compact" />
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function fallbackCategories(): FiqhCategory[] {
  return CATEGORIES.filter((c) => c.slug !== 'usul').map((c) => ({
    id: c.slug,
    slug: c.slug,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    descriptionEn: c.descriptionEn,
    orderIndex: c.orderIndex,
  }));
}

function fallbackMaraji(): Marja[] {
  return MARAJI.map((m) => ({
    id: m.slug,
    slug: m.slug,
    nameEn: m.nameEn,
    nameAr: m.nameAr,
    era: m.era,
    bioEn: m.bioEn,
    bioAr: null,
    websiteUrl: m.websiteUrl ?? null,
    orderIndex: m.orderIndex,
  }));
}
