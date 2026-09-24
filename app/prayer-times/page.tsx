'use client';

import Link from 'next/link';
import { Reveal } from '@/app/components/Reveal';
import { WorshipPanel } from '@/app/components/WorshipPanel';

export default function PrayerTimesPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8">
      <Reveal>
        <Link href="/" className="text-sm text-emerald-800 hover:underline">
          ← Home
        </Link>
        <h1 className="section-title mt-5">Salah times</h1>
        <p className="mt-3 max-w-xl text-white/50">
          Jafari (Ithna-Ashari) timings for your location — IP, GPS, or a city you choose.
        </p>
      </Reveal>
      <div className="mt-10">
        <WorshipPanel variant="full" showHeader={false} />
      </div>
    </main>
  );
}
