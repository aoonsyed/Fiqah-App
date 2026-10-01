'use client';

import { RulingBadge } from '@/app/components/RulingBadge';
import { formatFatwaDisplay } from '@/lib/fiqh/format-fatwa-display';
import type { FatwaSource } from '@/lib/fiqh/source-info';
import type { Fatwa } from '@/lib/fiqh/types';

/** "Islamic Laws · Ruling 1731 · View on sistani.org ↗", or a plain warning for generated text. */
export function SourceAttribution({ source, compact = false }: { source: FatwaSource; compact?: boolean }) {
  if (!source.verified) {
    return (
      <span className={`text-warn ${compact ? 'text-[11px]' : 'text-xs'}`} title={source.title}>
        ⚠ {compact ? 'Not a published ruling' : source.title}
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <span className="font-medium text-emerald-350">{source.title}</span>
      {source.reference && (
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-gold-200/90">
          {source.reference}
        </span>
      )}
      {source.url && !compact && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-gold-200 hover:underline"
        >
          View on {source.site ?? 'official site'} ↗
        </a>
      )}
    </span>
  );
}

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
  // The summary is the answer's first sentence; show the rest after it rather than repeating it.
  const rest = s.answerText.includes(s.hukmSummary)
    ? s.answerText.slice(s.answerText.indexOf(s.hukmSummary) + s.hukmSummary.length).trim()
    : s.answerText;

  return (
    <div className="space-y-4">
      {showMarjaHeader && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-white">{name}</h2>
            <RulingBadge type={d.displayRuling} />
          </div>
          <div className="mt-1.5">
            <SourceAttribution source={d.source} />
          </div>
        </div>
      )}

      {!showMarjaHeader && !hideRulingRow && (
        <div className="flex flex-wrap items-center gap-2">
          <RulingBadge type={d.displayRuling} />
        </div>
      )}

      {expanded && s.questionText && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Question</p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">{s.questionText}</p>
        </div>
      )}

      <div
        className={`rounded-xl border p-5 ${
          d.source.verified
            ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 to-emerald-950/20'
            : 'border-warn/25 bg-warn/[0.04]'
        } ${expanded ? '' : 'line-clamp-4'}`}
      >
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
            d.source.verified ? 'text-emerald-350' : 'text-warn'
          }`}
        >
          {d.source.verified ? `Ruling of ${name}` : 'Placeholder text, not a published ruling'}
        </p>
        <p className="mt-3 font-display text-base font-semibold leading-snug text-white sm:text-lg">
          {s.hukmSummary}
        </p>
        {expanded && rest && <p className="mt-3 text-sm leading-relaxed text-white/80">{rest}</p>}
        {!expanded && rest && <p className="mt-2 text-xs text-white/40">Tap to open full ruling</p>}
      </div>

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
          <span className="font-semibold text-white/70">Conditions: </span>
          {fatwa.conditionsEn}
        </p>
      )}

      {expanded && !showMarjaHeader && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span className="font-semibold text-white/60">Source:</span>
          <SourceAttribution source={d.source} />
        </div>
      )}

      {expanded && d.marjaContext && !/^On this masala/i.test(d.marjaContext) && (
        <p className="text-xs leading-relaxed text-white/45">{d.marjaContext}</p>
      )}

      {expanded && d.sourceNote && d.kind === 'comparative_seed' && (
        <p className="text-xs text-white/40">{d.sourceNote}</p>
      )}

      {expanded && d.disclaimer && (
        <p className="rounded-lg border border-warn/25 bg-warn/[0.06] p-3 text-xs leading-relaxed text-warn">
          {d.disclaimer}
        </p>
      )}
    </div>
  );
}
