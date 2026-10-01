import Link from 'next/link';
import { Reveal } from '@/app/components/Reveal';
import { HeroSearch } from '@/app/components/HeroSearch';
import { HorizontalCarousel } from '@/app/components/HorizontalCarousel';
import { WorshipPanel } from '@/app/components/WorshipPanel';
import type { PublishedMarjaCount } from '@/lib/fiqh/db';
import type { FiqhCategory, Marja } from '@/lib/fiqh/types';

export interface HomeData {
  /** False until the corpus has been imported (fresh install). */
  ready: boolean;
  categories: FiqhCategory[];
  maraji: Marja[];
  /** Maraji with rulings imported from their own works, largest first. */
  published: PublishedMarjaCount[];
  subcategories: number;
}

/** Matched on a slug fragment, so "family-law" and "family" both resolve. */
const TOPIC_ICONS: [string, string][] = [
  ['worship', '🕌'],
  ['family', '💍'],
  ['financ', '💼'],
  ['conduct', '🧭'],
  ['medic', '⚕️'],
  ['tech', '📱'],
  ['social', '🤝'],
  ['politic', '⚖️'],
  ['econom', '📊'],
  ['judic', '🏛️'],
];

const topicIcon = (slug: string) => TOPIC_ICONS.find(([key]) => slug.includes(key))?.[1] ?? '📖';

/** Below this, a marja's imported material is a sample rather than a body of rulings worth headlining. */
const HEADLINE_MIN_RULINGS = 100;

/** "Ayatollah Sayyid Ali al-Sistani" → "Ali al-Sistani" */
function shortName(name: string): string {
  return name.replace(/^(Grand\s+)?(Ayatollah|Allamah)\s+(Sayyid\s+)?/i, '').trim();
}

function marjaInitials(name: string): string {
  return shortName(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const fmt = (n: number) => n.toLocaleString('en-US');

export function FiqhHomeHub({ data }: { data: HomeData }) {
  const { ready, published } = data;
  const categories = data.categories.filter((c) => c.slug !== 'usul');
  const totalRulings = published.reduce((sum, p) => sum + p.rulings, 0);
  const headline = published.filter((p) => p.rulings >= HEADLINE_MIN_RULINGS);
  const rulingsByMarja = new Map(published.map((p) => [p.marja.slug, p.rulings]));

  return (
    <main>
      <section className="relative mx-auto max-w-7xl overflow-hidden px-5 pb-10 pt-12 sm:px-8 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-24 h-72 w-72 animate-float rounded-full bg-gradient-to-br from-emerald-500/25 to-transparent opacity-50 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-4 top-48 h-48 w-48 animate-float rounded-full bg-gold-400/15 blur-3xl"
          style={{ animationDelay: '-3s' }}
        />

        <div className="relative max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-300/80">
            Shia fiqh, from the sources
          </p>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            What did your marja <span className="text-gradient-gold">actually rule?</span>
          </h1>
          {ready && totalRulings > 0 ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
              Search <strong className="font-semibold text-white">{fmt(totalRulings)} published rulings</strong> from{' '}
              {listNames(headline.map((p) => shortName(p.marja.nameEn)))} — in plain language, with every answer
              traced to its book and issue number.
            </p>
          ) : (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
              Search published rulings from the maraji in plain language, with every answer traced to its source.
            </p>
          )}

          <div className="mt-9">
            <HeroSearch />
          </div>
          <p className="mt-6 text-sm text-white/45">
            Prefer to ask in your own words?{' '}
            <Link href="/chat" className="font-semibold text-gold-200 hover:underline">
              Ask the assistant →
            </Link>
          </p>
        </div>

        {!ready ? (
          <div className="mt-12 rounded-2xl border border-dashed border-gold-300/25 bg-white/[0.02] p-6">
            <h2 className="font-display text-lg font-bold text-white">Connect &amp; seed your corpus</h2>
            <p className="mt-2 text-sm text-white/50">
              Run fiqh migrations, set Supabase keys, then{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-gold-100">npm run fiqh:import</code>
            </p>
          </div>
        ) : (
          headline.length > 0 && (
            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-y border-white/8 py-6">
              {headline.map((p) => (
                <div key={p.marja.slug}>
                  <dd className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                    {fmt(p.rulings)}
                  </dd>
                  <dt className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/40">
                    {shortName(p.marja.nameEn)}
                  </dt>
                </div>
              ))}
              {data.subcategories > 0 && (
                <div>
                  <dd className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
                    {fmt(data.subcategories)}
                  </dd>
                  <dt className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-white/40">Topics</dt>
                </div>
              )}
            </dl>
          )
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <WorshipPanel variant="compact" />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Browse by topic</h2>
            <p className="text-xs text-white/35 sm:hidden">Swipe to browse</p>
          </div>
        </Reveal>
        <div className="mt-7">
          <HorizontalCarousel label="Topics">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/topics/${c.slug}`}
                className="group block h-full rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition hover:border-gold-300/30 hover:bg-white/[0.05]"
              >
                <span aria-hidden className="text-2xl transition group-hover:scale-110">
                  {topicIcon(c.slug)}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-white">{c.nameEn}</h3>
                {c.descriptionEn && <p className="mt-2 line-clamp-2 text-sm text-white/45">{c.descriptionEn}</p>}
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
            <p className="text-xs text-white/35 sm:hidden">Swipe to browse</p>
          </div>
        </Reveal>
        <div className="mt-7">
          <HorizontalCarousel
            label="Maraji"
            itemClassName="min-w-[78%] sm:min-w-[calc(45%-0.5rem)] lg:min-w-[calc(30%-0.67rem)] snap-start"
          >
            {data.maraji.map((m) => {
              const rulings = rulingsByMarja.get(m.slug) ?? 0;
              return (
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
                      <p className="mt-1 text-xs text-emerald-300/70">
                        {rulings > 0 ? `${fmt(rulings)} published rulings` : 'Published rulings not yet imported'}
                      </p>
                    </div>
                  </div>
                  {m.bioEn && <p className="mt-3 line-clamp-3 flex-1 text-sm text-white/45">{m.bioEn}</p>}
                  {rulings > 0 && (
                    <Link
                      href={`/search?q=${encodeURIComponent(m.nameEn.split(' ').slice(-1)[0] ?? m.slug)}`}
                      className="mt-4 text-xs font-semibold text-gold-200 hover:underline"
                    >
                      Search rulings →
                    </Link>
                  )}
                </article>
              );
            })}
          </HorizontalCarousel>
        </div>
      </section>
    </main>
  );
}
