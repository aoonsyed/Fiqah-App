'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveLocation } from '@/app/components/useLiveLocation';
import { compassDirection, distanceMeters, qiblaBearing } from '@/lib/qibla';
import { QiblaCompass } from '@/app/components/QiblaCompass';
import { PrayerTimeline, type PrayerTimes } from '@/app/components/PrayerTimeline';
import { HadithSlider } from '@/app/components/HadithSlider';
import { CorpusExplorer } from '@/app/components/CorpusExplorer';
import { Reveal, CountUp } from '@/app/components/Reveal';

interface CorpusStats {
  totalBooks: number;
  totalHadiths: number;
  /** null when the count could not be read — never render it as 0. */
  totalChunks: number | null;
  books: { title: string; count: number; docType?: string; author?: string | null }[];
}

const FEATURES = [
  {
    href: '/chat',
    title: 'Ask anything',
    desc: 'Pose a question in plain language. Every answer cites the hadith it came from — book, chapter, and chain.',
    icon: 'M8 10h8M8 14h5M21 12a9 9 0 11-3.6-7.2L21 3v6h-6',
    accent: 'from-emerald-500/20',
  },
  {
    href: '/search',
    title: 'Search the corpus',
    desc: 'Keyword and topical search across the full library, with narrator chains and gradings attached.',
    icon: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
    accent: 'from-sky-500/20',
  },
  {
    href: '/qibla',
    title: 'Qibla finder',
    desc: 'A live compass computing the great-circle bearing from wherever you stand to the Kaaba.',
    icon: 'M12 22a10 10 0 100-20 10 10 0 000 20zM16.2 7.8l-2.9 6.4-6.4 2.9 2.9-6.4 6.4-2.9z',
    accent: 'from-gold-300/20',
  },
  {
    href: '/prayer-times',
    title: 'Prayer times',
    desc: 'Jafari-method timings for your exact coordinates, with a countdown to the next salah.',
    icon: 'M12 8v4l3 2M12 22a10 10 0 100-20 10 10 0 000 20z',
    accent: 'from-violet-500/20',
  },
];

export default function Home() {
  const { location, status } = useLiveLocation();
  const [prayers, setPrayers] = useState<PrayerTimes | null>(null);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [statsReady, setStatsReady] = useState(false);
  const lastPrayerFix = useRef<{ lat: number; lng: number } | null>(null);

  const denied = !location && (status === 'denied' || status === 'unavailable');

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data?.error ? null : data))
      .catch(() => setStats(null))
      .finally(() => setStatsReady(true));
  }, []);

  // Pure geometry, so the bearing follows every new fix with no round-trip.
  const qibla = useMemo(() => {
    if (!location) return null;
    const bearing = qiblaBearing(location.lat, location.lng);
    return { bearing, direction: compassDirection(bearing) };
  }, [location]);

  // Timings barely move over a few km, so only real travel triggers a refetch.
  useEffect(() => {
    if (!location) return;

    const previous = lastPrayerFix.current;
    if (previous && distanceMeters(previous.lat, previous.lng, location.lat, location.lng) < 5000) return;
    lastPrayerFix.current = { lat: location.lat, lng: location.lng };

    fetch(`/api/prayer-times?lat=${location.lat}&lng=${location.lng}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setPrayers(data))
      .catch(() => {});
  }, [location]);

  // Books are the honest test of an empty corpus: a count that failed to load
  // must not be read as "nothing is there".
  const hasCorpus = !!stats && stats.totalBooks > 0;
  return (
    <main>
      {/* ---------- Hero ---------- */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-up">
            <span className="eyebrow">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Retrieval-grounded · Never invented
            </span>

            <h1 className="mt-7 font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl">
              The hadith corpus,
              <br />
              <span className="text-gradient-gold">answerable.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/55">
              Ask a question the way you&rsquo;d ask a teacher. Nūr searches the Shia hadith library and answers only from
              what it finds — showing you the narration, the chain, and the grading behind every sentence.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/chat" className="btn-gold">
                Ask your first question
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/search" className="btn-ghost">
                Browse the library
              </Link>
            </div>

            {/* Live corpus counts — empty until books are ingested */}
            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                { v: stats?.totalHadiths ?? null, l: 'Narrations' },
                { v: stats?.totalBooks ?? null, l: 'Books' },
                { v: stats?.totalChunks ?? null, l: 'Chunks' },
              ].map((s) => (
                <div key={s.l}>
                  <dd className="font-display text-3xl font-bold text-white tabular-nums">
                    {!statsReady ? (
                      <span className="inline-block h-8 w-16 animate-pulse rounded bg-white/10" />
                    ) : s.v === null ? (
                      // The count didn't load; a zero here would be a lie.
                      '—'
                    ) : (
                      <CountUp value={s.v} />
                    )}
                  </dd>
                  <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-white/40">{s.l}</dt>
                </div>
              ))}
            </dl>
            {statsReady && !hasCorpus && (
              <p className="mt-4 text-xs text-white/35">
                No books have been ingested yet — add one from the{' '}
                <Link href="/admin" className="text-gold-200 hover:underline">
                  admin panel
                </Link>{' '}
                to populate these.
              </p>
            )}
          </div>

          {/* Live compass */}
          <div className="relative flex justify-center animate-fade-up" style={{ animationDelay: '180ms' }}>
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative">
              <QiblaCompass bearing={qibla?.bearing ?? null} size={320} />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Narration of the moment ---------- */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <HadithSlider />
        </Reveal>
      </section>

      {/* ---------- Live location strip ---------- */}
      <section className="mx-auto mt-8 max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <div className="card flex flex-col justify-between p-7">
              <div>
                <p className="eyebrow">Your position</p>
                <h3 className="mt-3 font-display text-2xl font-bold text-white">Facing the Kaaba</h3>
              </div>

              {qibla ? (
                <>
                  <div className="mt-6">
                    <p className="font-display text-5xl font-bold text-gradient-gold">{qibla.bearing.toFixed(1)}°</p>
                    <p className="mt-1 text-sm text-emerald-350">{qibla.direction}</p>
                  </div>
                  <div className="mt-6 space-y-1.5 border-t border-white/10 pt-5 text-sm text-white/45">
                    <p className="flex justify-between">
                      <span>Latitude</span>
                      <span className="tabular-nums text-white/75">{location?.lat.toFixed(4)}°</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Longitude</span>
                      <span className="tabular-nums text-white/75">{location?.lng.toFixed(4)}°</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-8 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">
                  {denied
                    ? (
                      <>
                        Your location isn&rsquo;t available.{' '}
                        <Link href="/qibla" className="font-semibold text-gold-200 underline-offset-4 hover:underline">
                          Choose your city
                        </Link>{' '}
                        to see your Qibla and prayer times.
                      </>
                    )
                    : 'Detecting your location…'}
                </div>
              )}
            </div>

            <PrayerTimeline times={prayers} />
          </div>
        </Reveal>
      </section>

      {/* ---------- Features ---------- */}
      <section className="mx-auto mt-32 max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">What&rsquo;s inside</p>
          <h2 className="section-title mt-5">Four tools, one library</h2>
          <p className="mt-5 text-lg text-white/50">
            Everything here runs against the same verified corpus — so the answer you read and the hadith you cite are
            the same text.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.href} delay={i * 90}>
              <Link href={f.href} className="card group block h-full p-8">
                <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:border-gold-300/40">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold-200" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.icon} />
                    </svg>
                  </span>
                  <h3 className="mt-6 font-display text-2xl font-bold text-white">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">{f.desc}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-200">
                    Open
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Corpus analytics (real counts) ---------- */}
      <section className="mx-auto mt-32 max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">The corpus</p>
        </Reveal>

        <Reveal className="mt-8">
          {!statsReady ? (
            <div className="card h-[420px] animate-pulse p-8" />
          ) : hasCorpus && (stats?.books.length ?? 0) > 0 ? (
            <CorpusExplorer books={stats!.books} />
          ) : (
            <div className="card p-8">
              <div className="py-14 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                </span>
                {/* A failed request is not an empty corpus — say which it is. */}
                <p className="mt-5 font-display text-2xl text-white/75">
                  {statsReady && !stats ? 'Corpus counts unavailable' : 'No books indexed yet'}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-white/40">
                  {statsReady && !stats
                    ? 'The library is there, but its counts could not be read just now. Reload to try again.'
                    : 'Once you ingest a book, its narration counts appear here — drawn straight from the database, not estimated.'}
                </p>
                {statsReady && !stats ? (
                  <button type="button" onClick={() => window.location.reload()} className="btn-ghost mt-7">
                    Reload
                  </button>
                ) : (
                  <Link href="/admin" className="btn-ghost mt-7">
                    Go to admin panel
                  </Link>
                )}
              </div>
            </div>
          )}
        </Reveal>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto mt-32 max-w-7xl px-5 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-gold-300/20 bg-gradient-to-br from-gold-400/12 via-night-800 to-emerald-900/25 p-12 text-center sm:p-20">
            <div className="pattern-girih absolute inset-0 opacity-40" />
            <div className="relative">
              <h2 className="section-title">Start with one question</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/55">
                No account needed to ask. Sign in when you want your conversations saved.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link href="/chat" className="btn-gold">
                  Open the chat
                </Link>
                <Link href="/signup" className="btn-ghost">
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
