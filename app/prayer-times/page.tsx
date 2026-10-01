import type { Metadata } from 'next';
import { WorshipPanel } from '@/app/components/WorshipPanel';

export const metadata: Metadata = {
  title: 'Jafari prayer times',
  description: 'Shia Ithna-Ashari (Jafari) prayer times for your location, with a live countdown to the next prayer.',
};

export default function PrayerTimesPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8">
      <h1 className="section-title mt-6">Prayer times</h1>
      <p className="mt-4 max-w-2xl text-white/55">
        Shia Ithna-Ashari (Jafari) timings via Aladhan, for where you are — estimated from your connection, or set
        precisely with GPS or a city you choose.
      </p>
      <div className="mt-10">
        <WorshipPanel variant="full" showHeader={false} />
      </div>
    </main>
  );
}
