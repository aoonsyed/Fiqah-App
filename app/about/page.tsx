import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedCounts, type PublishedMarjaCount } from '@/lib/fiqh/db';
import { errorMessage } from '@/lib/errors';

export const metadata: Metadata = {
  title: 'About',
  description: 'Where Fiqah’s rulings come from, how answers are produced, and how to verify them.',
};

export const revalidate = 3600;

async function loadCounts(): Promise<PublishedMarjaCount[]> {
  try {
    return await listPublishedCounts();
  } catch (error) {
    console.error('About counts unavailable:', errorMessage(error));
    return [];
  }
}

export default async function AboutPage() {
  const counts = await loadCounts();

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="section-title">About Fiqah</h1>
      <p className="mt-6 leading-relaxed text-white/65">
        Fiqah makes the published rulings of Shia maraji searchable in plain language, so you can find what your marja
        actually wrote — and see exactly where it was written.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">Where the rulings come from</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Rulings are imported from each marja&apos;s own risalah and official question-and-answer collections. Every
          ruling shown links back to its book, issue number or official page.
        </p>
        {counts.length > 0 && (
          <ul className="mt-6 divide-y divide-white/8 rounded-xl border border-white/10">
            {counts.map(({ marja, rulings }) => (
              <li key={marja.slug} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
                <span className="text-white/80">{marja.nameEn}</span>
                <span className="tabular-nums text-white/50">{rulings.toLocaleString('en-US')} rulings</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">Placeholder answers</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          To lay out comparisons, some questions also carry generated placeholder text for maraji whose rulings
          haven&apos;t been imported yet. These are always marked &ldquo;Not a published ruling&rdquo; and are never
          a marja&apos;s fatwa. They are replaced as more published works are imported.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">How the assistant answers</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          The assistant searches the rulings library for the passages closest to your question and writes its answer
          from those passages only, citing each one. It can still misread a ruling or miss a condition. Before acting
          on any answer, confirm it with your marja&apos;s office or their official website.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">For developers</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Service status is at{' '}
          <Link href="/api/health" className="text-gold-200 hover:underline">
            /api/health
          </Link>{' '}
          and library counts at{' '}
          <Link href="/api/stats" className="text-gold-200 hover:underline">
            /api/stats
          </Link>{' '}
          (JSON).
        </p>
      </section>

      <p className="mt-12 text-sm text-white/45">
        See also the{' '}
        <Link href="/privacy" className="text-gold-200 hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </main>
  );
}
