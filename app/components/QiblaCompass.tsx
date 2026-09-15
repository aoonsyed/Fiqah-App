'use client';

import { useEffect, useState } from 'react';

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const CARDINALS = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

interface OrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

/**
 * Live heading from the device magnetometer, in degrees clockwise from north.
 * Returns null when no sensor is available (desktop), so the dial stays north-up.
 */
function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    const onOrient = (e: Event) => {
      const evt = e as OrientationEventiOS;
      if (typeof evt.webkitCompassHeading === 'number') {
        setHeading(evt.webkitCompassHeading);
      } else if (evt.absolute && typeof evt.alpha === 'number') {
        setHeading((360 - evt.alpha) % 360);
      }
    };

    const attach = () => {
      window.addEventListener('deviceorientationabsolute', onOrient);
      window.addEventListener('deviceorientation', onOrient);
    };

    // iOS 13+ only grants the sensor from inside a user gesture, so piggyback on
    // the first tap anywhere rather than making the reader press a button.
    const request = (DeviceOrientationEvent as any).requestPermission;
    let unlock: (() => void) | undefined;

    if (typeof request === 'function') {
      const onFirstGesture = async () => {
        try {
          if ((await request()) === 'granted') attach();
        } catch {
          /* denied — dial stays north-up */
        }
      };
      unlock = () => {
        window.removeEventListener('touchend', onFirstGesture);
        window.removeEventListener('click', onFirstGesture);
      };
      window.addEventListener('touchend', onFirstGesture, { once: true });
      window.addEventListener('click', onFirstGesture, { once: true });
    } else {
      attach();
    }

    return () => {
      unlock?.();
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, []);

  return heading;
}

export function QiblaCompass({ bearing, size = 260 }: { bearing: number | null; size?: number }) {
  const heading = useDeviceHeading();
  const ready = bearing !== null;
  const angle = bearing ?? 0;

  // Rotate the whole dial against the device heading so N tracks true north.
  const dialRotation = heading === null ? 0 : -heading;
  const live = heading !== null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <span className="absolute h-full w-full rounded-full border border-emerald-400/25 animate-pulse-ring" />
        <span
          className="absolute h-full w-full rounded-full border border-gold-300/20 animate-pulse-ring"
          style={{ animationDelay: '1.2s' }}
        />

        <svg viewBox="0 0 200 200" className="relative h-full w-full">
          <defs>
            <radialGradient id="dial" cx="50%" cy="35%">
              <stop offset="0%" stopColor="#14322a" />
              <stop offset="100%" stopColor="#060d14" />
            </radialGradient>
            <linearGradient id="needle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdf3d3" />
              <stop offset="60%" stopColor="#efcd6b" />
              <stop offset="100%" stopColor="#c8932a" />
            </linearGradient>
          </defs>

          <circle cx="100" cy="100" r="95" fill="url(#dial)" stroke="rgba(255,255,255,.12)" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(239,205,107,.14)" strokeDasharray="2 6" />

          {/* Everything below sits in the earth frame and counter-rotates with the device */}
          <g
            style={{
              transform: `rotate(${dialRotation}deg)`,
              transformOrigin: '100px 100px',
              transition: live ? 'transform .25s linear' : 'transform 1.2s cubic-bezier(.22,1,.36,1)',
            }}
          >
            {TICKS.map((t) => {
              const major = t % 45 === 0;
              return (
                <line
                  key={t}
                  x1="100"
                  y1={major ? 10 : 13}
                  x2="100"
                  y2={major ? 20 : 16}
                  stroke={major ? 'rgba(239,205,107,.7)' : 'rgba(255,255,255,.18)'}
                  strokeWidth={major ? 2 : 1}
                  transform={`rotate(${t} 100 100)`}
                />
              );
            })}

            {CARDINALS.map((c) => {
              const rad = ((c.angle - 90) * Math.PI) / 180;
              const isNorth = c.label === 'N';
              return (
                <text
                  key={c.label}
                  x={100 + 76 * Math.cos(rad)}
                  y={100 + 76 * Math.sin(rad) + 4}
                  textAnchor="middle"
                  className={isNorth ? 'fill-gold-200 text-[12px] font-bold' : 'fill-white/45 text-[11px] font-semibold'}
                >
                  {c.label}
                </text>
              );
            })}

            {/* Qibla needle */}
            <g
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: '100px 100px',
                transition: 'transform 1.4s cubic-bezier(.22,1,.36,1)',
              }}
            >
              <line x1="100" y1="100" x2="100" y2="46" stroke="rgba(239,205,107,.25)" strokeWidth="1" />
              <polygon points="100,38 105.5,100 100,92 94.5,100" fill="url(#needle)" />
              <polygon points="100,162 104,100 100,108 96,100" fill="rgba(255,255,255,.1)" />
              <circle cx="100" cy="44" r="8.5" fill="#05090f" stroke="#efcd6b" strokeWidth="1.5" />
              <text x="100" y="47.5" textAnchor="middle" className="text-[8px]">
                🕋
              </text>
            </g>
          </g>

          <circle cx="100" cy="100" r="5" fill="#efcd6b" />
          <circle cx="100" cy="100" r="11" fill="none" stroke="rgba(239,205,107,.3)" />
        </svg>
      </div>

      {/* Readout lives outside the dial so nothing overlaps the ticks */}
      <p className="font-display text-4xl font-bold leading-none text-gradient-gold tabular-nums">
        {ready ? `${angle.toFixed(1)}°` : '—'}
      </p>
    </div>
  );
}
