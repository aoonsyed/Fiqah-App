'use client';

import Link from 'next/link';
import { Reveal } from '@/app/components/Reveal';
import { WorshipPanel } from '@/app/components/WorshipPanel';

export default function QiblaPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8">
      <Reveal>
        <Link href="/" className="text-sm text-gold-200 hover:underline">
          ← Home
        </Link>
        <h1 className="section-title mt-6">Qibla compass</h1>
        <p className="mt-4 max-w-2xl text-white/55">
          Bearing to the Kaaba from your location. On mobile, tap the screen once to enable the live compass needle.
        </p>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-10">
          <WorshipPanel variant="full" showHeader={false} />
        </div>
      </Reveal>
    </main>
  );
}
