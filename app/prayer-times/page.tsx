'use client';

import { useEffect, useRef, useState } from 'react';
import { PrayerTimeline, type PrayerTimes as Times } from '@/app/components/PrayerTimeline';
import { Reveal } from '@/app/components/Reveal';
import { LocationPicker } from '@/app/components/LocationPicker';
import { useLiveLocation, usePlaceName } from '@/app/components/useLiveLocation';
import { distanceMeters } from '@/lib/qibla';

interface PrayerData extends Times {
  imsak: string;
  midnight: string;
  date: string;
  latitude: number;
  longitude: number;
  method: string;
}

/** Timings shift by well under a minute across a few km, so only real travel warrants a refetch. */
const REFETCH_AFTER_METERS = 5000;

export default function PrayerTimesPage() {
  const { location, status, chooseLocation, useDeviceLocation } = useLiveLocation();
  const placeName = usePlaceName(location);
  const [times, setTimes] = useState<PrayerData | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const lastFix = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!location) return;

    const previous = lastFix.current;
    if (previous && distanceMeters(previous.lat, previous.lng, location.lat, location.lng) < REFETCH_AFTER_METERS) {
      return;
    }
    lastFix.current = { lat: location.lat, lng: location.lng };

    const controller = new AbortController();
    setFailed(false);
    fetch(`/api/prayer-times?lat=${location.lat}&lng=${location.lng}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => setTimes(data))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        lastFix.current = null; // so the next fix or a retry fetches again
        setFailed(true);
      });
    return () => controller.abort();
  }, [location, retryKey]);

  // With no position, the picker explains why and offers city search.
  const needsCity = !location && (status === 'denied' || status === 'unavailable' || status === 'unsupported');

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal className="text-center">
        <p className="eyebrow">Jafari calculation</p>
        <h1 className="section-title mt-5">Prayer Times</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          Timings computed for your exact coordinates, with a live countdown to the next salah.
        </p>
      </Reveal>

      <Reveal className="mt-10">
        <LocationPicker
          location={location}
          status={status}
          placeName={placeName}
          onChoose={chooseLocation}
          onUseDevice={useDeviceLocation}
        />
      </Reveal>

      {!times && !needsCity && !failed && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="text-sm text-white/45">Locating you…</p>
        </div>
      )}

      {failed && (
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-red-400/25 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-200">Could not reach the prayer-time service.</p>
          <button type="button" onClick={() => setRetryKey((k) => k + 1)} className="btn-ghost mt-4 !py-2 text-xs">
            Try again
          </button>
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
                    ['Location', placeName ?? '—'],
                    ['Date', times.date],
                    ['Method', times.method],
                    ['Imsak (stop eating before fast)', times.imsak],
                    ['Midnight (end of Isha time)', times.midnight],
                    ['Coordinates', `${times.latitude.toFixed(4)}°, ${times.longitude.toFixed(4)}°`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-white/6 pb-3.5 last:border-0">
                      <dt className="text-white/40">{k}</dt>
                      <dd className="text-right font-semibold tabular-nums text-white/85">{v}</dd>
                    </div>
                  ))}
                </dl>
                {location?.source === 'gps' && (
                  <p className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4 text-xs text-white/35">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Tracking live — recalculates if you travel more than 5 km
                  </p>
                )}
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
