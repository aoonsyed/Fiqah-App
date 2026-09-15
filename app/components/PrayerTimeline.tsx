'use client';

import { useEffect, useMemo, useState } from 'react';

export interface PrayerTimes {
  fajr: string;
  sunrise?: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const ORDER: { key: keyof PrayerTimes; label: string; arabic: string; icon: string }[] = [
  { key: 'fajr', label: 'Fajr', arabic: 'الفجر', icon: '🌄' },
  { key: 'sunrise', label: 'Sunrise', arabic: 'الشروق', icon: '☀️' },
  { key: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر', icon: '🌞' },
  { key: 'asr', label: 'Asr', arabic: 'العصر', icon: '🌤️' },
  { key: 'maghrib', label: 'Maghrib', arabic: 'المغرب', icon: '🌅' },
  { key: 'isha', label: 'Isha', arabic: 'العشاء', icon: '🌙' },
];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function PrayerTimeline({ times }: { times: PrayerTimes | null }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const slots = useMemo(
    () =>
      times
        ? ORDER.filter((p) => times[p.key]).map((p) => ({ ...p, time: times[p.key]!.slice(0, 5) }))
        : [],
    [times],
  );

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const upcoming = slots.find((s) => toMinutes(s.time) > nowMins) ?? slots[0];
  const currentIdx = slots.findIndex((s) => s === upcoming) - 1;

  // Minutes until the next prayer, wrapping past midnight when the next slot is tomorrow's Fajr
  const minsLeft = upcoming ? (toMinutes(upcoming.time) - nowMins + 1440) % 1440 : 0;
  const countdown = `${String(Math.floor(minsLeft / 60)).padStart(2, '0')}h ${String(minsLeft % 60).padStart(2, '0')}m`;
  const dayProgress = (nowMins / 1440) * 100;

  if (!times) {
    return (
      <div className="card grid h-72 place-items-center p-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="mt-4 text-sm text-white/45">Awaiting your location…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Jafari method</p>
          <h3 className="mt-3 font-display text-3xl font-bold text-white">Today&rsquo;s Prayers</h3>
        </div>
        {upcoming && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Next · {upcoming.label}</p>
            <p className="font-display text-3xl font-bold text-gradient-gold tabular-nums">{countdown}</p>
          </div>
        )}
      </div>

      {/* Day progress rail */}
      <div className="relative mt-8 h-1.5 rounded-full bg-white/8">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-gold-300 to-gold-500 transition-all duration-1000"
          style={{ width: `${dayProgress}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-night-900 bg-gold-200 shadow-lg shadow-gold-400/50 transition-all duration-1000"
          style={{ left: `${dayProgress}%` }}
        />
      </div>

      <div className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot, i) => {
          const isNext = slot === upcoming;
          const passed = i <= currentIdx;
          return (
            <div
              key={slot.key}
              className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-500 ${
                isNext
                  ? 'border-gold-300/50 bg-gradient-to-br from-gold-300/15 to-transparent'
                  : passed
                    ? 'border-white/6 bg-white/[0.02] opacity-55'
                    : 'border-white/10 bg-white/[0.03] hover:border-emerald-400/40 hover:bg-white/[0.06]'
              }`}
            >
              {isNext && <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-gold-300" />}
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{slot.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{slot.label}</p>
                  <p className="font-arabic text-xs text-white/40" dir="rtl">
                    {slot.arabic}
                  </p>
                </div>
              </div>
              <p
                className={`mt-3 font-display text-2xl font-bold tabular-nums ${
                  isNext ? 'text-gradient-gold' : 'text-white/85'
                }`}
              >
                {slot.time}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
