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
  const noLocation = !location && (status === 'unavailable' || status === 'denied');

  /** Times area: a skeleton until they arrive, so the card keeps its height throughout. */
  const timesArea = (v: 'strip' | 'full') =>
    timesError ? (
      <p className="text-sm text-rose-300">Prayer times are unavailable right now. Please try again shortly.</p>
    ) : noLocation ? (
      <p className="text-sm text-white/55">We couldn&rsquo;t detect your location. Choose your city above to see prayer times.</p>
    ) : (
      <PrayerTimeline times={location ? times : null} variant={v} />
    );
  const distKm =
    location && bearing !== null
      ? Math.round(distanceToKaabaKm(location.lat, location.lng)).toLocaleString()
      : null;

  /* —— Home: one slim row —— */
  if (compact) {
    return (
      <section className="rounded-xl border border-white/10 bg-night-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">Salah &amp; Qibla</p>
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

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="min-w-0 flex-1">{timesArea('strip')}</div>

          <div className="flex shrink-0 items-center gap-3 border-t border-white/8 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <QiblaCompass bearing={bearing} size={88} compact />
            {location && bearing !== null && (
              <div className="min-w-0 text-xs">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Qibla</p>
                <p className="font-display text-lg font-bold tabular-nums text-emerald-350">
                  {Math.round(bearing)}°
                </p>
                <p className="text-white/45">
                  {compassDirection(bearing)} · {distKm} km
                </p>
                <Link href="/qibla" className="mt-0.5 inline-block font-medium text-emerald-350 hover:underline">
                  Compass →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* —— Dedicated pages —— */
  return (
    <section>
      {showHeader && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Today</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">Direction &amp; salah</h2>
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
        <div className="mb-4 flex justify-end">
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

      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-8">
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-night-800 p-4">
          <QiblaCompass bearing={bearing} size={160} compact />
          {location && bearing !== null && (
            <p className="mt-3 text-center text-sm text-white/55">
              <span className="font-semibold text-emerald-350">{Math.round(bearing)}°</span>
              {' · '}
              {compassDirection(bearing)} · {distKm} km
            </p>
          )}
        </div>

        <div>{timesArea('full')}</div>
      </div>
    </section>
  );
}
