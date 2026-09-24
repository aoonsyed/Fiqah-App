'use client';

import Link from 'next/link';
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

const PRAYER_KEYS = new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

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
  variant?: 'full' | 'embedded' | 'strip';
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

  const prayerSlots = useMemo(() => slots.filter((s) => PRAYER_KEYS.has(s.key)), [slots]);

  const zone = times?.timezone ?? null;
  const localNow = useMemo(() => inTimeZone(now, zone), [now, zone]);
  const nowMins = localNow.getHours() * 60 + localNow.getMinutes();
  const isFriday = localNow.getDay() === 5;

  const upcoming = prayerSlots.find((s) => toMinutes(s.time) > nowMins) ?? prayerSlots[0];
  const currentIdx = prayerSlots.findIndex((s) => s === upcoming) - 1;
  const minsLeft = upcoming ? (toMinutes(upcoming.time) - nowMins + 1440) % 1440 : 0;
  const hoursLeft = Math.floor(minsLeft / 60);
  const minsOnly = minsLeft % 60;

  if (!times) {
    return <p className="text-xs text-white/40">Loading…</p>;
  }

  /* Compact horizontal strip for home */
  if (variant === 'strip') {
    return (
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-white/70">
            Next{' '}
            <span className="font-semibold text-emerald-800">{upcoming?.label}</span>
            <span className="ml-1.5 font-display text-base font-bold tabular-nums text-white">
              {upcoming?.time}
            </span>
          </p>
          <p className="text-xs tabular-nums text-white/40">
            in {String(hoursLeft).padStart(2, '0')}h {String(minsOnly).padStart(2, '0')}m
          </p>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
          {prayerSlots.map((slot, i) => {
            const isNext = slot === upcoming;
            const passed = i <= currentIdx;
            return (
              <div
                key={slot.key}
                className={`min-w-[3.5rem] flex-1 rounded-md px-1.5 py-1.5 text-center ${
                  isNext ? 'bg-emerald-950' : ''
                }`}
              >
                <p className={`text-[10px] ${isNext ? 'font-semibold text-emerald-800' : passed ? 'text-white/30' : 'text-white/45'}`}>
                  {isFriday && slot.key === 'dhuhr' ? 'Jumuʿah' : slot.label}
                </p>
                <p
                  className={`mt-0.5 font-display text-sm font-semibold tabular-nums ${
                    isNext ? 'text-white' : passed ? 'text-white/30' : 'text-white/70'
                  }`}
                >
                  {slot.time}
                </p>
              </div>
            );
          })}
        </div>
        <Link href="/prayer-times" className="mt-2 inline-block text-[11px] font-medium text-emerald-800 hover:underline">
          Full times →
        </Link>
      </div>
    );
  }

  /* Full / embedded — table layout */
  return (
    <div>
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">Next · Jafari</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{upcoming?.label}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums text-emerald-800">{upcoming?.time}</p>
            <p className="text-xs text-white/45">
              in {String(hoursLeft).padStart(2, '0')}h {String(minsOnly).padStart(2, '0')}m
            </p>
          </div>
        </div>
      </div>

      <table className="mt-3 w-full text-sm">
        <tbody>
          {slots.map((slot, i) => {
            const isNext = slot.key === upcoming?.key;
            const passed = prayerSlots.findIndex((s) => s.key === slot.key) <= currentIdx && PRAYER_KEYS.has(slot.key);
            const label = isFriday && slot.key === 'dhuhr' ? 'Jumuʿah / Dhuhr' : slot.label;
            return (
              <tr key={slot.key} className={`border-b border-white/8 ${isNext ? 'bg-emerald-950/40' : ''}`}>
                <td className={`py-2 pl-1 font-medium ${passed && !isNext ? 'text-white/35' : 'text-white/75'}`}>
                  {label}
                </td>
                <td
                  className={`py-2 pr-1 text-right font-display text-base font-semibold tabular-nums ${
                    isNext ? 'text-emerald-800' : passed ? 'text-white/30' : 'text-white/65'
                  }`}
                >
                  {slot.time}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
