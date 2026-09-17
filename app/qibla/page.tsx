'use client';

import { useMemo } from 'react';
import { QiblaCompass } from '@/app/components/QiblaCompass';
import { Reveal } from '@/app/components/Reveal';
import { LocationPicker } from '@/app/components/LocationPicker';
import { useLiveLocation, usePlaceName } from '@/app/components/useLiveLocation';
import { compassDirection, distanceToKaabaKm, qiblaBearing } from '@/lib/qibla';

export default function QiblaPage() {
  const { location, status, chooseLocation, useDeviceLocation } = useLiveLocation();
  const placeName = usePlaceName(location);

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

  // With no position, the picker below explains why and offers city search.
  const needsCity = !location && (status === 'denied' || status === 'unavailable' || status === 'unsupported');

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal className="text-center">
        <p className="eyebrow">Great-circle bearing</p>
        <h1 className="section-title mt-5">Qibla Direction</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          The shortest path along the earth&rsquo;s surface from where you stand to the Kaaba in Makkah.
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

      {!qibla && !needsCity && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="text-sm text-white/45">Locating you…</p>
        </div>
      )}

      {qibla && location && (
        <>
          <Reveal className="mt-14 flex justify-center">
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
                  'On a phone the dial turns with you. Rotate until the prompt under the dial says you are facing the Qibla.',
                  'Without a compass sensor (most laptops), face the bearing shown using a physical compass or known landmark.',
                  'Keep away from metal and electronics, which throw magnetic compasses off by several degrees.',
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
                {location.source === 'gps' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Tracking live · updated {new Date(location.updatedAt).toLocaleTimeString()}
                  </span>
                ) : (
                  <span>Calculated for the city centre — within a few km the bearing barely changes</span>
                )}
                <span className="tabular-nums">
                  {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                  {location.source === 'gps' && ` ±${Math.round(location.accuracy)}m`}
                </span>
              </div>
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
