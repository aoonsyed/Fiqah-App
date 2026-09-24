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
    <div>
      {showHeader && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Today</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
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
          />
        </div>
      )}

      <div className={`grid gap-10 lg:grid-cols-2 lg:gap-14 ${compact ? '' : ''}`}>
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-night-800 p-6 sm:p-8">
          <QiblaCompass bearing={bearing} size={compact ? 200 : 260} />
          {location && bearing !== null && (
            <dl className="mt-6 flex w-full max-w-xs justify-between text-center text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/40">Bearing</dt>
                <dd className="mt-1 font-display text-lg font-bold text-emerald-800">
                  {Math.round(bearing)}° {compassDirection(bearing)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/40">Kaaba</dt>
                <dd className="mt-1 font-display text-lg font-bold text-white tabular-nums">{distKm} km</dd>
              </div>
            </dl>
          )}
          {compact && (
            <Link href="/qibla" className="mt-5 text-xs font-semibold text-emerald-800 hover:underline">
              Open compass →
            </Link>
          )}
        </div>

        <div>
          {timesError && <p className="text-sm text-rose-600">Could not load prayer times.</p>}
          {!location && status === 'locating' && (
            <div className="h-56 animate-pulse rounded-xl bg-white/5" />
          )}
          {location && !timesError && <PrayerTimeline times={times} />}
          {compact && location && !timesError && (
            <Link href="/prayer-times" className="mt-4 inline-block text-xs font-semibold text-emerald-800 hover:underline">
              Full day →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
