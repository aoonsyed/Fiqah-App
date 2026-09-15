'use client';

import React, { useState, useEffect } from 'react';
import { QiblaCompass } from '@/app/components/QiblaCompass';
import { Reveal } from '@/app/components/Reveal';

interface QiblaData {
  bearing: number;
  direction: string;
  latitude: number;
  longitude: number;
}

const KAABA = { lat: 21.4225, lng: 39.8262 };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function QiblaPage() {
  const [qibla, setQibla] = useState<QiblaData | null>(null);
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
          const res = await fetch(`/api/qibla?lat=${coords.latitude}&lng=${coords.longitude}`);
          if (!res.ok) throw new Error('Failed to get Qibla direction');
          setQibla(await res.json());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error getting Qibla direction');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access was denied. Enable it in your browser to find the Qibla.');
        setLoading(false);
      },
    );
  }, []);

  const distance = qibla ? haversineKm(qibla.latitude, qibla.longitude, KAABA.lat, KAABA.lng) : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal className="text-center">
        <p className="eyebrow">Great-circle bearing</p>
        <h1 className="section-title mt-5">Qibla Direction</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
          The shortest path along the earth&rsquo;s surface from where you stand to the Kaaba in Makkah.
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

      {qibla && (
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
              { label: 'Distance', value: `${Math.round(distance!).toLocaleString()} km`, sub: 'to the Kaaba' },
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
              <p className="mt-7 border-t border-white/10 pt-5 text-xs text-white/35">
                Your position: {qibla.latitude.toFixed(4)}°, {qibla.longitude.toFixed(4)}°
              </p>
            </div>
          </Reveal>
        </>
      )}
    </main>
  );
}
