'use client';

import Link from 'next/link';
import { Reveal } from '@/app/components/Reveal';
import { WorshipPanel } from '@/app/components/WorshipPanel';

export default function QiblaPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8">
      <Reveal>
        <Link href="/" className="text-sm text-emerald-800 hover:underline">
          ← Home
        </Link>
        <h1 className="section-title mt-5">Qibla</h1>
        <p className="mt-3 max-w-xl text-white/50">
          Bearing to the Kaaba from your location. On a phone, tap once to unlock the live compass.
        </p>
      </Reveal>
      <div className="mt-10">
        <WorshipPanel variant="full" showHeader={false} />
      </div>
    </main>
  );
}
