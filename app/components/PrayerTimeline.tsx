'use client';

import { useEffect, useMemo, useState } from 'react';

export interface PrayerTimes {
  fajr: string;
  sunrise?: string;
  dhuhr: string;
  asr: string;
  sunset?: string;
  maghrib: string;
  isha: string;
  timezone?: string | null;
}

interface Slot {
  key: string;
  label: string;
  arabic: string;
  time: string;
}

const ORDER: { key: keyof PrayerTimes; label: string; arabic: string }[] = [
  { key: 'fajr', label: 'Fajr', arabic: 'الفجر' },
  { key: 'sunrise', label: 'Sunrise', arabic: 'الشروق' },
  { key: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر' },
  { key: 'asr', label: 'Asr', arabic: 'العصر' },
  { key: 'maghrib', label: 'Maghrib', arabic: 'المغرب' },
  { key: 'isha', label: 'Isha', arabic: 'العشاء' },
];

const FRIDAY = 5;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function inTimeZone(date: Date, timeZone?: string | null): Date {
  if (!timeZone) return date;
  try {
    return new Date(date.toLocaleString('en-US', { timeZone }));
  } catch {
    return date;
  }
}

export function PrayerTimeline({
  times,
  variant = 'full',
}: {
  times: PrayerTimes | null;
  variant?: 'full' | 'embedded';
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const slots: Slot[] = useMemo(
    () =>
      times ? ORDER.filter((p) => times[p.key]).map((p) => ({ ...p, time: String(times[p.key]).slice(0, 5) })) : [],
    [times],
  );

  const zone = times?.timezone ?? null;
  const localNow = useMemo(() => inTimeZone(now, zone), [now, zone]);
  const nowMins = localNow.getHours() * 60 + localNow.getMinutes();
  const isFriday = localNow.getDay() === FRIDAY;

  const upcoming = slots.find((s) => toMinutes(s.time) > nowMins) ?? slots[0];
  const currentIdx = slots.findIndex((s) => s === upcoming) - 1;
  const minsLeft = upcoming ? (toMinutes(upcoming.time) - nowMins + 1440) % 1440 : 0;
  const hoursLeft = Math.floor(minsLeft / 60);
  const minsOnly = minsLeft % 60;
  const dayProgress = (nowMins / 1440) * 100;

  const clock = localNow.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const today = localNow.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const deviceZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const elsewhere = Boolean(zone && deviceZone && zone !== deviceZone);

  if (!times) {
    return (
      <div className="grid h-56 place-items-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="mt-3 text-sm text-white/40">Loading prayer times…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={variant === 'embedded' ? '' : ''}>
      {/* Next prayer hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/60 via-night-800/40 to-transparent p-6 ring-1 ring-white/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-400/15 blur-2xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300/80">
              Next · Jafari
            </p>
            <p className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {upcoming?.label ?? '—'}
            </p>
            <p className="mt-1 font-arabic text-lg text-white/40" dir="rtl">
              {upcoming?.arabic}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold tabular-nums text-gold-200 sm:text-4xl">
              {upcoming?.time}
            </p>
            <p className="mt-2 text-sm text-white/55">
              in{' '}
              <span className="font-semibold tabular-nums text-white">
                {String(hoursLeft).padStart(2, '0')}h {String(minsOnly).padStart(2, '0')}m
              </span>
            </p>
          </div>
        </div>

        <div className="relative mt-6 h-1 rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-gold-300 transition-all duration-1000"
            style={{ width: `${dayProgress}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/40">
          <span>{today}</span>
          <span className="tabular-nums">
            {clock}
            {zone ? ` · ${zone.replace(/_/g, ' ')}` : ''}
          </span>
        </div>
      </div>

      {/* Slim vertical timeline */}
      <ol className="mt-5 space-y-0">
        {slots.map((slot, i) => {
          const isNext = slot === upcoming;
          const passed = i <= currentIdx;
          const label =
            isFriday && slot.key === 'dhuhr' ? 'Jumuʿah / Dhuhr' : slot.label;

          return (
            <li key={slot.key} className="relative flex gap-4 py-2.5">
              <div className="flex w-4 flex-col items-center">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-night-900 ${
                    isNext
                      ? 'bg-gold-300 shadow-[0_0_12px_rgba(239,205,107,0.6)]'
                      : passed
                        ? 'bg-emerald-500/60'
                        : 'bg-white/25'
                  }`}
                />
                {i < slots.length - 1 && (
                  <span className={`mt-1 w-px flex-1 ${passed ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                )}
              </div>
              <div
                className={`flex min-w-0 flex-1 items-baseline justify-between gap-3 rounded-xl px-3 py-1.5 transition ${
                  isNext ? 'bg-gold-300/10' : ''
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isNext ? 'text-gold-100' : passed ? 'text-white/40' : 'text-white/80'
                    }`}
                  >
                    {label}
                  </p>
                  <p className="font-arabic text-[11px] text-white/30" dir="rtl">
                    {slot.arabic}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-display text-lg font-semibold tabular-nums ${
                    isNext ? 'text-gold-200' : passed ? 'text-white/35' : 'text-white/70'
                  }`}
                >
                  {slot.time}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {elsewhere && (
        <p className="mt-3 text-[11px] text-white/35">
          Times are local to {zone!.replace(/_/g, ' ')}, not your device timezone.
        </p>
      )}
    </div>
  );
}
