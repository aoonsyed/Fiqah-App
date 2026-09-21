'use client';

import Link from 'next/link';
import { RulingBadge } from '@/app/components/RulingBadge';
import type { CompareSummary, Fatwa } from '@/lib/fiqh/types';

function marjaInitials(name: string): string {
  const parts = name.replace(/^Ayatollah|^Allamah|^Sayyid|^Grand/gi, '').trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function FatwaCard({ fatwa, questionSlug }: { fatwa: Fatwa; questionSlug: string }) {
  const name = fatwa.marja?.nameEn ?? 'Marja';
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-lg shadow-black/20 transition hover:border-gold-300/35 hover:from-white/[0.08]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600/80 to-emerald-900 text-sm font-bold text-gold-100 ring-1 ring-white/10">
          {marjaInitials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-white">{name}</h3>
          <div className="mt-2">
            <RulingBadge type={fatwa.rulingType} />
          </div>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-white/60 line-clamp-5">{fatwa.answerEn}</p>
      {fatwa.marja?.slug && (
        <p className="mt-3 text-[10px] uppercase tracking-wider text-white/30">{fatwa.marja.slug}</p>
      )}
    </article>
  );
}

export function MarjaCompareGrid({
  data,
  title = 'Marja answers',
  maxCards,
  hideQuestionTitle,
}: {
  data: CompareSummary;
  title?: string;
  maxCards?: number;
  hideQuestionTitle?: boolean;
}) {
  const { question, fatwas, agreement } = data;
  const shown = maxCards ? fatwas.slice(0, maxCards) : fatwas;
  const hidden = maxCards && fatwas.length > maxCards ? fatwas.length - maxCards : 0;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">{title}</p>
          {!hideQuestionTitle && (
            <h2 className="mt-2 font-display text-lg font-bold text-white sm:text-xl">{question.questionEn}</h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {agreement.dominantRuling && <RulingBadge type={agreement.dominantRuling} />}
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/50">
            {fatwas.length} marja{fatwas.length === 1 ? '' : ' answers'}
            {agreement.unanimous ? ' · aligned' : ' · compare differences'}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((f) => (
          <FatwaCard key={f.id} fatwa={f} questionSlug={question.slug} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/compare/${question.slug}`} className="btn-gold !py-2 !text-sm">
          Full comparison table
        </Link>
        <Link href={`/masail/${question.slug}`} className="btn-ghost !py-2 !text-sm">
          Read full answers
        </Link>
        {hidden > 0 && (
          <span className="self-center text-xs text-white/40">+{hidden} more on compare page</span>
        )}
      </div>
    </section>
  );
}
