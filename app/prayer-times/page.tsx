'use client';

import React, { useState, useEffect } from 'react';
import { PrayerTimeline, type PrayerTimes as Times } from '@/app/components/PrayerTimeline';
import { Reveal } from '@/app/components/Reveal';

interface PrayerData extends Times {
  date: string;
  latitude: number;
  longitude: number;
  method: string;
}

export default function PrayerTimesPage() {
  const [times, setTimes] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return setLoading(false);
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/prayer-times?lat=${coords.latitude}&lng=${coords.longitude}`);
          if (!res.ok) throw new Error('Failed to get prayer times');
          setTimes(await res.json());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error getting prayer times');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access was denied. Enable it to see timings for your area.');
        setLoading(false);
      },
    );
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal className="text-center">
        <p className="eyebrow">Jafari calculation</p>
        <h1 className="section-title mt-5">Prayer Times</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          Timings computed for your exact coordinates, with a live countdown to the next salah.
        </p>
      </Reveal>

      {loading && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="text-sm text-white/45">Locating you…</p>
        </div>
      )}

      {error && (
        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-red-400/25 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {times && (
        <>
          <Reveal className="mt-14">
            <PrayerTimeline times={times} />
          </Reveal>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="card h-full p-7">
                <h2 className="font-display text-xl font-bold text-white">Calculation details</h2>
                <dl className="mt-6 space-y-3.5 text-sm">
                  {[
                    ['Date', times.date],
                    ['Method', times.method],
                    ['Latitude', `${times.latitude.toFixed(4)}°`],
                    ['Longitude', `${times.longitude.toFixed(4)}°`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-white/6 pb-3.5 last:border-0">
                      <dt className="text-white/40">{k}</dt>
                      <dd className="font-semibold tabular-nums text-white/85">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={110}>
              <div className="card h-full overflow-hidden p-7">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/12 blur-3xl" />
                <div className="relative">
                  <span className="eyebrow">Fiqh note</span>
                  <h2 className="mt-4 font-display text-xl font-bold text-white">Combining prayers</h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">
                    In Jafari jurisprudence, Dhuhr and Asr share a combined time period, as do Maghrib and Isha. The
                    times listed here mark the beginning of each prayer&rsquo;s window rather than a fixed obligation.
                  </p>
                  <p className="mt-6 font-arabic text-xl text-gold-300/70" dir="rtl">
                    أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </>
      )}
    </main>
  );
}
