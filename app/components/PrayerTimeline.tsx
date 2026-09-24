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

export function PrayerTimeline({ times }: { times: PrayerTimes | null }) {
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

  const clock = localNow.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const today = localNow.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  if (!times) {
    return (
      <div className="grid h-48 place-items-center text-sm text-white/40">Loading prayer times…</div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Next · Jafari
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-4xl font-bold text-white">{upcoming?.label}</p>
            <p className="mt-1 font-arabic text-base text-white/40" dir="rtl">
              {upcoming?.arabic}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold tabular-nums text-emerald-800">{upcoming?.time}</p>
            <p className="mt-1 text-sm text-white/50">
              in {String(hoursLeft).padStart(2, '0')}h {String(minsOnly).padStart(2, '0')}m
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-white/40">
          {today} · {clock}
          {zone ? ` · ${zone.replace(/_/g, ' ')}` : ''}
        </p>
      </div>

      <table className="mt-5 w-full text-sm">
        <tbody>
          {slots.map((slot, i) => {
            const isNext = slot === upcoming;
            const passed = i <= currentIdx;
            const label = isFriday && slot.key === 'dhuhr' ? 'Jumuʿah / Dhuhr' : slot.label;
            return (
              <tr
                key={slot.key}
                className={`border-b border-white/8 ${isNext ? 'bg-emerald-950/50' : ''}`}
              >
                <td className={`py-2.5 pl-2 font-medium ${passed && !isNext ? 'text-white/35' : 'text-white/80'}`}>
                  {label}
                </td>
                <td className="py-2.5 text-right font-arabic text-xs text-white/30" dir="rtl">
                  {slot.arabic}
                </td>
                <td
                  className={`py-2.5 pr-2 text-right font-display text-base font-semibold tabular-nums ${
                    isNext ? 'text-emerald-800' : passed ? 'text-white/30' : 'text-white/70'
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
