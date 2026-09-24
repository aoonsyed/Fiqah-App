'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CountUp, Reveal } from '@/app/components/Reveal';
import { HorizontalCarousel } from '@/app/components/HorizontalCarousel';
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

const TOPIC_ICON: Record<string, string> = {
  worship: '🕌',
  family: '💍',
  transactions: '💼',
  social: '🤝',
  medical: '⚕️',
  technology: '📱',
  governance: '⚖️',
  economy: '📊',
  judiciary: '🏛️',
};

function marjaInitials(name: string): string {
  return name
    .replace(/^Ayatollah|^Allamah|^Sayyid|^Grand/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
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

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.slug !== 'usul'),
    [categories],
  );

  const dbReady = stats?.ready && (stats.stats?.questions ?? 0) > 0;
  const marjaCount = stats?.stats?.maraji ?? maraji.length;

  return (
    <main>
      <section className="relative mx-auto max-w-7xl overflow-hidden px-5 pb-8 pt-12 sm:px-8 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-24 h-72 w-72 animate-float rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent opacity-50 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-4 top-48 h-48 w-48 animate-float rounded-full bg-gold-400/15 blur-3xl"
          style={{ animationDelay: '-3s' }}
        />

        <Reveal className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-300/80">
            Comparative Shia fiqh
          </p>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Fiqah
          </h1>
          <p className="mt-4 font-display text-2xl font-semibold text-white/70 sm:text-3xl">
            <span className="text-gradient-gold">{marjaCount} maraji</span>
            <span className="text-white/40"> · </span>
            one question
          </p>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
            Search masail, compare rulings side by side, and ask in plain language — with Qibla and Jafari
            prayer times for where you are.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/chat" className="btn-gold">
              Ask a question
            </Link>
            <Link href="/search" className="btn-ghost">
              Search masail
            </Link>
          </div>
        </Reveal>

        {!ready ? (
          <div className="mt-12 h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
        ) : !dbReady ? (
          <Reveal delay={80}>
            <div className="mt-12 rounded-2xl border border-dashed border-gold-300/25 bg-white/[0.02] p-6">
              <h2 className="font-display text-lg font-bold text-white">Connect & seed your corpus</h2>
              <p className="mt-2 text-sm text-white/50">
                Run fiqh migrations, set Supabase keys, then{' '}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-gold-100">npm run fiqh:seed-mass</code>
              </p>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={80}>
            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-y border-white/8 py-6">
              {[
                { v: stats!.stats!.questions, l: 'Questions' },
                { v: stats!.stats!.fatwas, l: 'Fatwas' },
                { v: stats!.stats!.maraji, l: 'Maraji' },
                { v: stats!.stats!.subcategories, l: 'Topics' },
              ].map((s) => (
                <div key={s.l}>
                  <dd className="font-display text-2xl font-bold text-white tabular-nums sm:text-3xl">
                    <CountUp value={s.v} />
                  </dd>
                  <dt className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/35">{s.l}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        <Reveal delay={100}>
          <form
            className="mt-10 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
              }
            }}
          >
            <div className="flex gap-2 rounded-full border border-white/12 bg-white/[0.04] p-1.5 ring-1 ring-transparent transition focus-within:border-gold-300/30 focus-within:ring-gold-300/20">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fiqh — e.g. khums, fasting travel…"
                className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button type="submit" className="btn-gold !rounded-full !px-5 !py-2">
                Search
              </button>
            </div>
          </form>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <Reveal delay={40}>
          <WorshipPanel variant="compact" />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Topics</h2>
            <p className="text-xs text-white/35">Swipe to browse</p>
          </div>
        </Reveal>
        <div className="mt-7">
          <HorizontalCarousel autoMs={4500}>
            {visibleCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/topics/${c.slug}`}
                className="group block h-full rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition hover:border-gold-300/30 hover:bg-white/[0.05]"
              >
                <span className="text-2xl transition group-hover:scale-110">{TOPIC_ICON[c.slug] ?? '📖'}</span>
                <h3 className="mt-4 font-display text-xl font-bold text-white">{c.nameEn}</h3>
                {c.descriptionEn && (
                  <p className="mt-2 line-clamp-2 text-sm text-white/40">{c.descriptionEn}</p>
                )}
                <span className="mt-4 inline-flex text-xs font-semibold text-gold-200">
                  Explore <span className="ml-1 transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </HorizontalCarousel>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Maraji</h2>
            <Link href="/search" className="text-sm text-gold-200 hover:underline">
              Search rulings →
            </Link>
          </div>
        </Reveal>
        <div className="mt-7">
          <HorizontalCarousel
            autoMs={5500}
            itemClassName="min-w-[78%] sm:min-w-[calc(45%-0.5rem)] lg:min-w-[calc(30%-0.67rem)] snap-start"
          >
            {maraji.map((m) => (
              <article
                key={m.slug}
                className="flex h-full flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-gold-300/30"
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-950 text-sm font-bold text-gold-100 ring-1 ring-white/10">
                    {marjaInitials(m.nameEn)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-white">{m.nameEn}</p>
                    <p className="mt-1 text-xs capitalize text-emerald-300/70">{m.era}</p>
                  </div>
                </div>
                {m.bioEn && <p className="mt-3 line-clamp-3 flex-1 text-sm text-white/40">{m.bioEn}</p>}
                <Link
                  href={`/search?q=${encodeURIComponent(m.nameEn.split(' ').slice(-1)[0] ?? m.slug)}`}
                  className="mt-4 text-xs font-semibold text-gold-200 hover:underline"
                >
                  Search rulings →
                </Link>
              </article>
            ))}
          </HorizontalCarousel>
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
