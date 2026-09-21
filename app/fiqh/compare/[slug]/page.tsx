'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import { MarjaCompareGrid } from '@/app/components/MarjaCompareGrid';
import { RulingBadge } from '@/app/components/RulingBadge';
import type { CompareSummary } from '@/lib/fiqh/types';

export default function FiqhComparePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<CompareSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/fiqh/compare/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="mx-auto max-w-4xl px-5 py-16"><div className="card h-64 animate-pulse" /></div>;

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-white/60">Could not load comparison.</p>
        <Link href="/fiqh" className="btn-ghost mt-6 inline-block">
          Back
        </Link>
      </main>
    );
  }

  const { question, fatwas, agreement } = data;

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal>
        <Link href={`/masail/${question.slug}`} className="text-sm text-gold-200 hover:underline">
          ← Question detail
        </Link>
        <h1 className="section-title mt-6">Comparative view</h1>
        <p className="mt-4 text-white/55">{question.questionEn}</p>
      </Reveal>

      <Reveal delay={80}>
        <div className="card mt-10 p-6">
          <h2 className="font-display text-lg font-bold text-white">Agreement snapshot</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {agreement.dominantRuling && <RulingBadge type={agreement.dominantRuling} />}
            <span className="text-sm text-white/50">
              {agreement.unanimous
                ? 'All listed maraji share the same ruling type.'
                : 'Scholars differ — review each answer below.'}
            </span>
          </div>
          <dl className="mt-6 grid gap-2 sm:grid-cols-2">
            {Object.entries(agreement.rulingCounts).map(([type, count]) => (
              <div key={type} className="flex justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                <dt className="capitalize text-white/60">{type}</dt>
                <dd className="font-semibold text-white tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      <MarjaCompareGrid data={data} title="Marja cards" hideQuestionTitle maxCards={11} />

      <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
            <tr>
              <th className="px-4 py-3">Marja</th>
              <th className="px-4 py-3">Ruling</th>
              <th className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {fatwas.map((f) => (
              <tr key={f.id} className="border-t border-white/10">
                <td className="px-4 py-4 font-medium text-white">{f.marja?.nameEn}</td>
                <td className="px-4 py-4">
                  <RulingBadge type={f.rulingType} />
                </td>
                <td className="max-w-md px-4 py-4 text-white/55">{f.answerEn.slice(0, 160)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
