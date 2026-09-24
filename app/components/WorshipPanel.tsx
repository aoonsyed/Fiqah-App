'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LocationPicker } from '@/app/components/LocationPicker';
import { PrayerTimeline, type PrayerTimes } from '@/app/components/PrayerTimeline';
import { QiblaCompass } from '@/app/components/QiblaCompass';
import { useLiveLocation, usePlaceName } from '@/app/components/useLiveLocation';
import { compassDirection, distanceToKaabaKm, qiblaBearing } from '@/lib/qibla';

interface WorshipPanelProps {
  variant?: 'compact' | 'full';
  showHeader?: boolean;
}

export function WorshipPanel({ variant = 'full', showHeader = true }: WorshipPanelProps) {
  const { location, status, mode, chooseLocation, useDeviceLocation, useIpLocation } = useLiveLocation();
  const placeName = usePlaceName(location);
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [timesError, setTimesError] = useState(false);

  const bearing = useMemo(
    () => (location ? qiblaBearing(location.lat, location.lng) : null),
    [location],
  );

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    setTimesError(false);
    fetch(`/api/prayer-times?lat=${location.lat}&lng=${location.lng}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTimes(d))
      .catch(() => setTimesError(true));
    return () => controller.abort();
  }, [location?.lat, location?.lng]);

  const compact = variant === 'compact';
  const distKm =
    location && bearing !== null
      ? Math.round(distanceToKaabaKm(location.lat, location.lng)).toLocaleString()
      : null;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-emerald-950/40 via-night-900/80 to-night-950">
      {/* Atmosphere — no nested card chrome */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(16,185,129,0.18), transparent), radial-gradient(ellipse 60% 40% at 85% 20%, rgba(239,205,107,0.12), transparent)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />

      <div className={`relative ${compact ? 'p-5 sm:p-7' : 'p-6 sm:p-10'}`}>
        {showHeader && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/70">
                Facing Makkah
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Direction &amp; salah
              </h2>
            </div>
            <LocationPicker
              location={location}
              status={status}
              placeName={placeName}
              mode={mode}
              onChoose={chooseLocation}
              onUseDevice={useDeviceLocation}
              onUseIp={useIpLocation}
              variant="chip"
            />
          </div>
        )}

        {!showHeader && (
          <div className="mb-6 flex justify-end">
            <LocationPicker
              location={location}
              status={status}
              placeName={placeName}
              mode={mode}
              onChoose={chooseLocation}
              onUseDevice={useDeviceLocation}
              onUseIp={useIpLocation}
              variant="chip"
            />
          </div>
        )}

        <div
          className={`grid items-center gap-8 lg:gap-12 ${
            compact ? 'lg:grid-cols-[0.95fr_1.15fr]' : 'lg:grid-cols-2'
          }`}
        >
          {/* Compass stage */}
          <div className="relative flex flex-col items-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -m-8 rounded-full bg-emerald-500/10 blur-3xl"
              />
              <QiblaCompass bearing={bearing} size={compact ? 220 : 280} />
            </div>

            {location && bearing !== null && (
              <div className="mt-6 flex items-center gap-6 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Bearing</p>
                  <p className="mt-1 font-display text-xl font-bold text-gold-200">
                    {Math.round(bearing)}°
                    <span className="ml-1.5 text-sm font-normal text-white/50">
                      {compassDirection(bearing)}
                    </span>
                  </p>
                </div>
                <span className="h-8 w-px bg-white/10" aria-hidden />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">To Kaaba</p>
                  <p className="mt-1 font-display text-xl font-bold text-white tabular-nums">
                    {distKm} <span className="text-sm font-normal text-white/45">km</span>
                  </p>
                </div>
              </div>
            )}

            {compact && (
              <Link
                href="/qibla"
                className="mt-5 text-xs font-semibold text-gold-200/90 transition hover:text-gold-100"
              >
                Full compass →
              </Link>
            )}
          </div>

          {/* Prayer column */}
          <div>
            {timesError && (
              <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                Could not load prayer times.
              </p>
            )}
            {!location && status === 'locating' && (
              <div className="h-64 animate-pulse rounded-3xl bg-white/[0.04]" />
            )}
            {location && !timesError && (
              <PrayerTimeline times={times} variant="embedded" />
            )}
            {compact && location && !timesError && (
              <Link
                href="/prayer-times"
                className="mt-4 inline-block text-xs font-semibold text-gold-200/90 transition hover:text-gold-100"
              >
                Full day view →
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
