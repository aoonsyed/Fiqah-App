'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

type PermissionRequest = () => Promise<'granted' | 'denied'>;

/** Weight of each new sensor reading. Lower is steadier but lags more; 0.15 settles in ~0.3s at 60Hz. */
const SMOOTHING = 0.15;

/**
 * Live heading from the device magnetometer, in degrees clockwise from north.
 *
 * Raw readings jitter by several degrees, so they're low-pass filtered. The
 * filter averages sin/cos rather than degrees, so 359° and 1° average to 0°,
 * not 180°. `rotation` is the same heading unwrapped into a continuous angle,
 * so a dial turning past north takes the short way instead of spinning round.
 *
 * iOS only exposes the sensor after DeviceOrientationEvent.requestPermission()
 * is called from a tap — `needsPermission` says when to show that button.
 */
function useDeviceHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [denied, setDenied] = useState(false);
  const filter = useRef<{ sin: number; cos: number; rotation: number; last: number } | null>(null);
  const frame = useRef(0);
  const attached = useRef(false);

  const onOrient = useCallback((e: Event) => {
    const evt = e as OrientationEventiOS;
    let raw: number | null = null;
    if (typeof evt.webkitCompassHeading === 'number') raw = evt.webkitCompassHeading;
    else if (evt.absolute && typeof evt.alpha === 'number') raw = (360 - evt.alpha) % 360;
    if (raw === null) return;

    const rad = (raw * Math.PI) / 180;
    const f = filter.current;
    if (!f) {
      filter.current = { sin: Math.sin(rad), cos: Math.cos(rad), rotation: raw, last: raw };
    } else {
      f.sin += SMOOTHING * (Math.sin(rad) - f.sin);
      f.cos += SMOOTHING * (Math.cos(rad) - f.cos);
      const smoothed = ((Math.atan2(f.sin, f.cos) * 180) / Math.PI + 360) % 360;
      f.rotation += ((smoothed - f.last + 540) % 360) - 180;
      f.last = smoothed;
    }

    // Sensors fire faster than the screen refreshes; render at most once per frame.
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const cur = filter.current!;
        setHeading(cur.last);
        setRotation(cur.rotation);
      });
    }
  }, []);

  const attach = useCallback(() => {
    if (attached.current) return;
    attached.current = true;
    window.addEventListener('deviceorientationabsolute', onOrient);
    window.addEventListener('deviceorientation', onOrient);
  }, [onOrient]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const request = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest }).requestPermission;
    // Only phones and tablets have the sensor; a desktop with the API would show a button that does nothing.
    if (typeof request === 'function') setNeedsPermission(window.matchMedia('(pointer: coarse)').matches);
    else attach();

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('deviceorientation', onOrient);
      attached.current = false;
    };
  }, [attach, onOrient]);

  /** Must be called from a tap handler — iOS rejects it otherwise. */
  const requestPermission = useCallback(async () => {
    const request = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionRequest }).requestPermission;
    try {
      if (request && (await request()) === 'granted') {
        setNeedsPermission(false);
        attach();
      } else {
        setDenied(true);
      }
    } catch {
      setDenied(true);
    }
  }, [attach]);

  return { heading, rotation, needsPermission, denied, requestPermission };
}

export function QiblaCompass({
  bearing,
  size = 260,
  compact = false,
}: {
  bearing: number | null;
  size?: number;
  /** Hide large readout and pulse rings — for tight layouts */
  compact?: boolean;
}) {
  const { heading, rotation, needsPermission, denied, requestPermission } = useDeviceHeading();
  const ready = bearing !== null;
  const angle = bearing ?? 0;

  const live = heading !== null;
  const dialRotation = live ? -rotation : 0;

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0' : 'gap-4'}`}>
      <div
        className={`relative grid place-items-center transition-opacity ${ready ? '' : 'opacity-40'}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={ready ? `Qibla compass: ${Math.round(angle)} degrees from north` : 'Qibla compass: waiting for your location'}
      >
        {!compact && (
          <>
            <span className="absolute h-full w-full rounded-full border border-emerald-400/25 animate-pulse-ring" />
            <span
              className="absolute h-full w-full rounded-full border border-gold-300/20 animate-pulse-ring"
              style={{ animationDelay: '1.2s' }}
            />
          </>
        )}

        <svg viewBox="0 0 200 200" className="relative h-full w-full">
          <defs>
            <radialGradient id="dial" cx="50%" cy="35%">
              <stop offset="0%" stopColor="rgb(var(--c-emerald-950))" />
              <stop offset="100%" stopColor="rgb(var(--c-surface))" />
            </radialGradient>
            <linearGradient id="needle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-gold-100))" />
              <stop offset="60%" stopColor="rgb(var(--c-gold-300))" />
              <stop offset="100%" stopColor="rgb(var(--c-gold-500))" />
            </linearGradient>
          </defs>

          <circle cx="100" cy="100" r="95" fill="url(#dial)" stroke="rgb(var(--c-fg) / .16)" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgb(var(--c-gold-300) / .18)" strokeDasharray="2 6" />

          <g
            style={{
              transform: `rotate(${dialRotation}deg)`,
              transformOrigin: '100px 100px',
              // Readings are already smoothed; a short linear tween just fills the gaps between frames.
              transition: live ? 'transform .12s linear' : 'transform 1.2s cubic-bezier(.22,1,.36,1)',
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
                  stroke={major ? 'rgb(var(--c-gold-300) / .75)' : 'rgb(var(--c-fg) / .22)'}
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

            <g
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: '100px 100px',
                transition: 'transform 1.4s cubic-bezier(.22,1,.36,1)',
              }}
            >
              <line x1="100" y1="100" x2="100" y2="46" stroke="rgb(var(--c-gold-300) / .3)" strokeWidth="1" />
              <polygon points="100,38 105.5,100 100,92 94.5,100" fill="url(#needle)" />
              <polygon points="100,162 104,100 100,108 96,100" fill="rgb(var(--c-fg) / .12)" />
              <circle cx="100" cy="44" r="8.5" fill="rgb(var(--c-bg))" stroke="rgb(var(--c-gold-300))" strokeWidth="1.5" />
              {/* Kaaba: drawn rather than an emoji, which renders differently on every platform. */}
              <g transform="translate(100 44)">
                <rect x="-4.5" y="-4.5" width="9" height="9" rx="0.8" fill="#151515" stroke="rgb(var(--c-gold-300) / .6)" strokeWidth="0.5" />
                <rect x="-4.5" y="-2.4" width="9" height="1.5" fill="rgb(var(--c-gold-300))" />
              </g>
            </g>
          </g>

          <circle cx="100" cy="100" r="5" fill="rgb(var(--c-gold-300))" />
          <circle cx="100" cy="100" r="11" fill="none" stroke="rgb(var(--c-gold-300) / .35)" />
        </svg>
      </div>

      {!compact && (
        <>
          <p className="font-display text-4xl font-bold leading-none text-gradient-gold tabular-nums">
            {ready ? `${angle.toFixed(1)}°` : '—'}
          </p>
          {ready && live && <AlignmentHint bearing={angle} heading={heading} />}
        </>
      )}
      {compact && ready && live && Math.abs(((angle - heading + 540) % 360) - 180) <= ALIGNED_WITHIN_DEG && (
        <p className="mt-1 text-[10px] font-semibold text-emerald-300">Facing Qibla</p>
      )}
      {ready && needsPermission && (
        <button
          type="button"
          onClick={requestPermission}
          className={`rounded-full border border-gold-300/40 font-semibold text-gold-200 transition hover:bg-gold-300/10 ${
            compact ? 'mt-2 px-2.5 py-1 text-[10px]' : 'px-4 py-1.5 text-sm'
          }`}
        >
          Enable live compass
        </button>
      )}
      {!compact && denied && (
        <p className="max-w-xs text-center text-xs text-white/45">
          Compass access was declined. The bearing above still works — face it using any compass.
        </p>
      )}
    </div>
  );
}

/** Phone compasses wander a few degrees; tighter than this would flicker. */
const ALIGNED_WITHIN_DEG = 5;

/** Tells the user which way to turn, using the device's live heading. */
function AlignmentHint({ bearing, heading }: { bearing: number; heading: number }) {
  // Signed shortest turn in (-180, 180]: positive means turn right (clockwise).
  const turn = ((bearing - heading + 540) % 360) - 180;
  const aligned = Math.abs(turn) <= ALIGNED_WITHIN_DEG;

  return (
    <p
      role="status"
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
        aligned
          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
          : 'border-white/12 bg-white/5 text-white/60'
      }`}
    >
      {aligned
        ? 'You are facing the Qibla'
        : `Turn ${turn > 0 ? 'right' : 'left'} ${Math.round(Math.abs(turn))}°`}
    </p>
  );
}
