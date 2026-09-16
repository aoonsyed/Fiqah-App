'use client';

import { useMemo } from 'react';
import { QiblaCompass } from '@/app/components/QiblaCompass';
import { Reveal } from '@/app/components/Reveal';
import { useLiveLocation } from '@/app/components/useLiveLocation';
import { compassDirection, distanceToKaabaKm, qiblaBearing } from '@/lib/qibla';

export default function QiblaPage() {
  const { location, status } = useLiveLocation();

  // Pure geometry, so it recomputes the moment a new fix arrives — no round-trip.
  const qibla = useMemo(() => {
    if (!location) return null;
    const bearing = qiblaBearing(location.lat, location.lng);
    return {
      bearing,
      direction: compassDirection(bearing),
      distance: distanceToKaabaKm(location.lat, location.lng),
    };
  }, [location]);

  const error =
    status === 'denied'
      ? 'Location access was denied. Enable it in your browser to find the Qibla.'
      : status === 'unsupported'
        ? 'Geolocation is not available in this browser.'
        : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal className="text-center">
        <p className="eyebrow">Great-circle bearing</p>
        <h1 className="section-title mt-5">Qibla Direction</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          The shortest path along the earth&rsquo;s surface from where you stand to the Kaaba in Makkah.
        </p>
      </Reveal>

      {!qibla && !error && (
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

      {qibla && location && (
        <>
          <Reveal className="mt-16 flex justify-center">
            <div className="animate-float">
              <QiblaCompass bearing={qibla.bearing} size={360} />
            </div>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              { label: 'Bearing', value: `${qibla.bearing.toFixed(1)}°`, sub: 'clockwise from true north' },
              { label: 'Direction', value: qibla.direction, sub: 'compass heading' },
              { label: 'Distance', value: `${Math.round(qibla.distance).toLocaleString()} km`, sub: 'to the Kaaba' },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 90}>
                <div className="card p-7 text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{stat.label}</p>
                  <p className="mt-3 font-display text-4xl font-bold text-gradient-gold">{stat.value}</p>
                  <p className="mt-2 text-xs text-white/35">{stat.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-6">
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold text-white">How to use this</h2>
              <ol className="mt-6 space-y-4">
                {[
                  'Lay your phone flat and let the physical compass settle.',
                  'Turn until your device’s north aligns with the dial’s N.',
                  'The gold needle now points to the Kaaba — face it to pray.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold-300/30 bg-gold-300/10 text-xs font-bold text-gold-200">
                      {i + 1}
                    </span>
                    <span className="pt-1 text-sm leading-relaxed text-white/55">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-white/35">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Tracking live · updated {new Date(location.updatedAt).toLocaleTimeString()}
                </span>
                <span className="tabular-nums">
                  {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}° ±{Math.round(location.accuracy)}m
                </span>
              </div>
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
