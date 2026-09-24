'use client';

import Link from 'next/link';
import { RulingBadge } from '@/app/components/RulingBadge';
import { formatFatwaDisplay } from '@/lib/fiqh/format-fatwa-display';
import type { Fatwa } from '@/lib/fiqh/types';

export function FatwaAnswerBody({
  fatwa,
  questionEn,
  expanded = true,
  showMarjaHeader = false,
  hideRulingRow = false,
}: {
  fatwa: Fatwa;
  questionEn?: string | null;
  expanded?: boolean;
  showMarjaHeader?: boolean;
  hideRulingRow?: boolean;
}) {
  const d = formatFatwaDisplay(fatwa, questionEn);
  const s = d.structured;
  const name = fatwa.marja?.nameEn ?? 'Marja';
  const displayQuestion = s.questionText ?? questionEn ?? null;

  return (
    <div className="space-y-4">
      {showMarjaHeader && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-white">{name}</h2>
          <RulingBadge type={d.displayRuling} />
          {d.rulingIsPlaceholder && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/90 ring-1 ring-amber-400/30">
              Awaiting official import
            </span>
          )}
        </div>
      )}

      {!showMarjaHeader && !hideRulingRow && (
        <div className="flex flex-wrap items-center gap-2">
          <RulingBadge type={d.displayRuling} />
          {d.rulingIsPlaceholder && d.kind === 'comparative_seed' && (
            <span className="text-[10px] uppercase tracking-wider text-amber-200/70">Aligned corpus text</span>
          )}
        </div>
      )}

      {expanded && displayQuestion && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Question (masala)</p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">{displayQuestion}</p>
        </div>
      )}

      <div
        className={`rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 to-emerald-950/20 p-5 ${
          expanded ? '' : 'line-clamp-4'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300/90">
          {d.kind === 'imported' ? 'Hukm — published answer' : 'Ruling & explanation'}
        </p>
        <p className="mt-3 font-display text-base font-semibold leading-snug text-white sm:text-lg">
          {s.hukmSummary}
        </p>
        {expanded && s.answerText !== s.hukmSummary && (
          <p className="mt-4 text-sm leading-relaxed text-white/80">{s.answerText}</p>
        )}
        {!expanded && s.answerText.length > s.hukmSummary.length && (
          <p className="mt-2 text-xs text-white/40">Tap to open full ruling</p>
        )}
      </div>

      {expanded && s.keyPoints.length > 1 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Points from the answer</p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-white/70">
            {s.keyPoints.map((pt) => (
              <li key={pt.slice(0, 48)}>{pt}</li>
            ))}
          </ul>
        </div>
      )}

      {expanded && s.exceptions.length > 0 && (
        <div className="rounded-xl border border-sky-500/25 bg-sky-950/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/80">Exception / condition</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sky-100/85">
            {s.exceptions.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
      )}

      {expanded && fatwa.conditionsEn && (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
          <span className="font-semibold text-white/70">Additional conditions (corpus): </span>
          {fatwa.conditionsEn}
        </p>
      )}

      {expanded && d.kind === 'imported' && s.isBriefOfficial && (
        <p className="text-xs leading-relaxed text-white/45">
          This is the complete English text from the marja&apos;s published istifta&apos; collection for this
          question. Practical Laws entries are often one or two sentences; the hukm above is the full official
          wording, not a summary.
        </p>
      )}

      {expanded && s.source && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span className="font-semibold text-white/60">Source:</span>
          <span>{s.source.title}</span>
          {s.source.number && (
            <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-gold-200/90">
              {s.source.number}
            </span>
          )}
          <Link href={s.source.url} target="_blank" rel="noopener noreferrer" className="text-gold-200 hover:underline">
            View on official site →
          </Link>
        </div>
      )}

      {expanded && d.marjaContext && !/^On this masala/i.test(d.marjaContext) && (
        <p className="text-xs leading-relaxed text-white/45">{d.marjaContext}</p>
      )}

      {expanded && d.sourceNote && d.kind === 'comparative_seed' && (
        <p className="text-xs text-white/40">{d.sourceNote}</p>
      )}

      {expanded && d.disclaimer && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-100/75">
          {d.disclaimer}
        </p>
      )}
    </div>
  );
}
