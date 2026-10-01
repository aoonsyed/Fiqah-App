import type { Metadata } from 'next';
import { WorshipPanel } from '@/app/components/WorshipPanel';

export const metadata: Metadata = {
  title: 'Qibla direction',
  description: 'The direction and distance to the Kaaba from your location, with a live compass on mobile.',
};

export default function QiblaPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8">
      <h1 className="section-title mt-6">Qibla compass</h1>
      <p className="mt-4 max-w-2xl text-white/55">
        Bearing to the Kaaba from your location. On a phone, tap &ldquo;Enable live compass&rdquo; and the dial turns
        with you.
      </p>
      <div className="mt-10">
        <WorshipPanel variant="full" showHeader={false} />
      </div>
    </main>
  );
}
