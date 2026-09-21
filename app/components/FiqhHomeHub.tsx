'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  usul: '📜',
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

  const dbReady = stats?.ready && (stats.stats?.questions ?? 0) > 0;
  const marjaCount = stats?.stats?.maraji ?? maraji.length;

  return (
    <main>
      <section className="relative mx-auto max-w-7xl overflow-hidden px-5 pb-10 pt-12 sm:px-8 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-24 h-64 w-64 animate-float rounded-full border border-gold-300/20 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-40 h-40 w-40 animate-float rounded-full bg-gold-400/10 blur-2xl"
          style={{ animationDelay: '-3s' }}
        />

        <Reveal className="max-w-3xl">
          <p className="eyebrow">Shia fiqh · Comparative corpus</p>
          <h1 className="mt-7 font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Pure fiqh.
            <br />
            <span className="text-gradient-gold">{marjaCount} maraji, one question.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/55">
            Browse masail, compare rulings, and ask in plain language — plus Qibla and Jafari prayer times for your
            location.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/chat" className="btn-gold">
              Ask a fiqh question
            </Link>
            <Link href="/search" className="btn-ghost">
              Search masail
            </Link>
            <Link href="/qibla" className="btn-ghost">
              Qibla
            </Link>
          </div>
        </Reveal>

        {!ready ? (
          <div className="card mt-14 h-36 animate-pulse" />
        ) : !dbReady ? (
          <Reveal delay={80}>
            <div className="card mt-14 border-dashed border-gold-300/25 p-8">
              <h2 className="font-display text-xl font-bold text-white">Connect & seed your corpus</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-white/55">
                <li>Run fiqh migrations in Supabase.</li>
                <li>Confirm keys in `.env.local`.</li>
                <li>
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-gold-100">npm run fiqh:seed-mass</code>
                </li>
              </ol>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={80}>
            <dl className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { v: stats!.stats!.questions, l: 'Questions' },
                { v: stats!.stats!.fatwas, l: 'Fatwas' },
                { v: stats!.stats!.maraji, l: 'Maraji' },
                { v: stats!.stats!.subcategories, l: 'Topics' },
              ].map((s) => (
                <div
                  key={s.l}
                  className="card p-6 transition duration-500 hover:scale-[1.02] hover:border-emerald-400/30"
                >
                  <dd className="font-display text-3xl font-bold text-white tabular-nums">
                    <CountUp value={s.v} />
                  </dd>
                  <dt className="mt-1 text-xs uppercase tracking-wider text-white/40">{s.l}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        <Reveal delay={100}>
          <form
            className="mx-auto mt-14 max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
              }
            }}
          >
            <div className="flex gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-2 shadow-lg shadow-emerald-950/30 ring-1 ring-gold-300/10 transition focus-within:ring-gold-300/35">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fiqh questions…"
                className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button type="submit" className="btn-gold !px-5 !py-2">
                Search
              </button>
            </div>
          </form>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <Reveal delay={60}>
          <WorshipPanel variant="compact" />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Jurisprudential domains</h2>
            <p className="text-xs uppercase tracking-widest text-white/35">Swipe or auto-scroll</p>
          </div>
        </Reveal>
        <div className="mt-8">
          <HorizontalCarousel autoMs={4500}>
            {categories.map((c, i) => (
              <Link
                key={c.slug}
                href={`/topics/${c.slug}`}
                className="card group block h-full p-6 transition hover:-translate-y-1"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-3xl transition group-hover:scale-110">{TOPIC_ICON[c.slug] ?? '📖'}</span>
                <h3 className="mt-4 font-display text-xl font-bold text-white">{c.nameEn}</h3>
                {c.descriptionEn && (
                  <p className="mt-2 line-clamp-3 text-sm text-white/45">{c.descriptionEn}</p>
                )}
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-gold-200">
                  Explore
                  <span className="transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </HorizontalCarousel>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Maraji in this corpus</h2>
            <Link href="/search?compareTop=1" className="text-sm text-gold-200 hover:underline">
              Compare masail →
            </Link>
          </div>
        </Reveal>
        <div className="mt-8">
          <HorizontalCarousel autoMs={5500} itemClassName="min-w-[78%] sm:min-w-[calc(45%-0.5rem)] lg:min-w-[calc(30%-0.67rem)] snap-start">
            {maraji.map((m) => (
              <article
                key={m.slug}
                className="card flex h-full flex-col p-5 transition hover:border-gold-300/35"
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-950 text-sm font-bold text-gold-100 ring-1 ring-white/10">
                    {marjaInitials(m.nameEn)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-white">{m.nameEn}</p>
                    <p className="mt-1 text-xs capitalize text-emerald-300/80">{m.era}</p>
                  </div>
                </div>
                {m.bioEn && <p className="mt-3 line-clamp-3 flex-1 text-sm text-white/45">{m.bioEn}</p>}
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
  return CATEGORIES.map((c) => ({
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
