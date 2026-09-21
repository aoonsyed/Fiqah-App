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

  return (
    <section
      className={`card relative overflow-hidden border-emerald-500/20 ${
        compact ? 'p-5 sm:p-6' : 'p-6 sm:p-10'
      }`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gold-400/10 blur-3xl" />

      {showHeader && (
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow !py-1 !text-[10px]">Worship tools</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
              Qibla & prayer times
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/50">
              Location from your IP by default — switch to GPS or pick a city anytime.
            </p>
          </div>
          {!compact && (
            <div className="flex gap-2">
              <Link href="/qibla" className="btn-ghost !px-4 !py-2 !text-xs">
                Full compass
              </Link>
              <Link href="/prayer-times" className="btn-gold !px-4 !py-2 !text-xs">
                All salah times
              </Link>
            </div>
          )}
        </div>
      )}

      <div className={`relative ${showHeader ? 'mt-8' : 'mt-0'}`}>
        <LocationPicker
          location={location}
          status={status}
          placeName={placeName}
          mode={mode}
          onChoose={chooseLocation}
          onUseDevice={useDeviceLocation}
          onUseIp={useIpLocation}
        />
      </div>

      <div
        className={`relative mt-8 grid gap-8 ${compact ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]' : 'lg:grid-cols-2'}`}
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <QiblaCompass bearing={bearing} size={compact ? 200 : 280} />
          {location && bearing !== null && (
            <dl className="mt-6 grid w-full max-w-xs grid-cols-2 gap-3 text-center text-xs">
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <dt className="text-white/40">Direction</dt>
                <dd className="font-semibold text-gold-200">{compassDirection(bearing)}</dd>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <dt className="text-white/40">To Kaaba</dt>
                <dd className="font-semibold text-white tabular-nums">
                  {Math.round(distanceToKaabaKm(location.lat, location.lng)).toLocaleString()} km
                </dd>
              </div>
            </dl>
          )}
          {compact && (
            <Link href="/qibla" className="mt-4 text-xs font-semibold text-gold-200 hover:underline">
              Open full compass →
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          {timesError && (
            <p className="text-center text-sm text-rose-200/90">Could not load prayer times. Try again shortly.</p>
          )}
          {!location && status === 'locating' && (
            <div className="h-48 animate-pulse rounded-xl bg-white/[0.04]" />
          )}
          {location && !timesError && <PrayerTimeline times={times} />}
          {compact && (
            <Link
              href="/prayer-times"
              className="mt-4 block text-center text-xs font-semibold text-gold-200 hover:underline"
            >
              Full day timeline →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
