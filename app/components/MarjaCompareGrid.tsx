'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { FatwaAnswerBody } from '@/app/components/FatwaAnswerBody';
import { RulingBadge } from '@/app/components/RulingBadge';
import { formatFatwaDisplay } from '@/lib/fiqh/format-fatwa-display';
import type { CompareSummary, Fatwa, RulingType } from '@/lib/fiqh/types';

const RULING_FILTER_LABEL: Record<RulingType, string> = {
  wajib: 'Wajib',
  mustahab: 'Mustahab',
  mubah: 'Mubah',
  makruh: 'Makruh',
  haram: 'Haram',
  conditional: 'Conditional',
  informational: 'Guidance',
  disputed: 'Disputed',
};

function marjaInitials(name: string): string {
  const parts = name.replace(/^Ayatollah|^Allamah|^Sayyid|^Grand/gi, '').trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function FatwaCard({
  fatwa,
  questionSlug,
  questionEn,
  expanded,
  pinned,
  onToggleExpand,
  onTogglePin,
  spotlight,
}: {
  fatwa: Fatwa;
  questionSlug: string;
  questionEn: string;
  expanded: boolean;
  pinned: boolean;
  onToggleExpand: () => void;
  onTogglePin: () => void;
  spotlight: boolean;
}) {
  const name = fatwa.marja?.nameEn ?? 'Marja';
  const canPin = true;
  const display = formatFatwaDisplay(fatwa, questionEn);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-lg shadow-black/20 transition-all duration-300 ${
        expanded
          ? 'col-span-full border-gold-300/40 from-white/[0.09] shadow-gold-300/5 ring-1 ring-gold-300/25'
          : 'border-white/10 hover:border-gold-300/35 hover:from-white/[0.08]'
      } ${pinned ? 'ring-2 ring-emerald-400/45' : ''} ${spotlight ? 'lg:col-span-2' : ''}`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full flex-col p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/50"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600/80 to-emerald-900 text-sm font-bold text-gold-100 ring-1 ring-white/10 transition group-hover:scale-105">
            {marjaInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-white">{name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RulingBadge type={display.displayRuling} />
              {display.rulingIsPlaceholder && (
                <span className="text-[10px] uppercase tracking-wider text-amber-200/60">Aligned</span>
              )}
              {!expanded && (
                <span className="text-[10px] uppercase tracking-wider text-white/35">Tap to open</span>
              )}
            </div>
          </div>
          <span
            className={`mt-1 shrink-0 text-gold-200/80 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▾
          </span>
        </div>
        {expanded ? (
          <div className="mt-4" onClick={(e) => e.stopPropagation()} role="presentation">
            <FatwaAnswerBody fatwa={fatwa} questionEn={questionEn} expanded hideRulingRow />
          </div>
        ) : (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-emerald-100/75">{display.rulingText}</p>
        )}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
        {fatwa.marja?.slug && (
          <p className="text-[10px] uppercase tracking-wider text-white/30">{fatwa.marja.slug}</p>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {canPin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                pinned
                  ? 'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/40'
                  : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {pinned ? 'Pinned ✓' : 'Pin to compare'}
            </button>
          )}
          {expanded && (
            <Link
              href={`/masail/${questionSlug}`}
              className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-gold-200/90 hover:bg-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              Full question →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function SideBySidePanel({
  a,
  b,
  questionEn,
  onClear,
}: {
  a: Fatwa;
  b: Fatwa;
  questionEn: string;
  onClear: () => void;
}) {
  const da = formatFatwaDisplay(a, questionEn);
  const db = formatFatwaDisplay(b, questionEn);
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gold-300/30 bg-gradient-to-b from-gold-300/[0.08] to-transparent transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-200/90">Side-by-side compare</p>
        <button type="button" onClick={onClear} className="text-xs text-white/45 hover:text-white/70">
          Clear pins
        </button>
      </div>
      <div className="grid gap-0 lg:grid-cols-2">
        {[a, b].map((f, i) => (
          <div
            key={f.id}
            className={`p-5 ${i === 0 ? 'lg:border-r lg:border-white/10' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-white">{f.marja?.nameEn}</h4>
              <RulingBadge type={i === 0 ? da.displayRuling : db.displayRuling} />
            </div>
            <p className="mt-3 max-h-64 overflow-y-auto text-sm leading-relaxed text-white/65">
              {i === 0 ? da.rulingText : db.rulingText}
            </p>
            {f.conditionsEn && (
              <p className="mt-3 text-xs text-white/45">Conditions: {f.conditionsEn}</p>
            )}
          </div>
        ))}
      </div>
    </div>
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
  const [showAllCards, setShowAllCards] = useState(!maxCards);
  const [rulingFilter, setRulingFilter] = useState<RulingType | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (rulingFilter === 'all') return fatwas;
    return fatwas.filter((f) => formatFatwaDisplay(f, question.questionEn).displayRuling === rulingFilter);
  }, [fatwas, rulingFilter, question.questionEn]);

  const displayList = useMemo(() => {
    if (showAllCards || !maxCards) return filtered;
    return filtered.slice(0, maxCards);
  }, [filtered, showAllCards, maxCards]);

  const hiddenCount = !showAllCards && maxCards ? Math.max(0, filtered.length - maxCards) : 0;

  const displayRulingCounts = useMemo(() => {
    const counts = {} as Record<RulingType, number>;
    for (const f of fatwas) {
      const rt = formatFatwaDisplay(f, question.questionEn).displayRuling;
      counts[rt] = (counts[rt] ?? 0) + 1;
    }
    return counts;
  }, [fatwas, question.questionEn]);

  const rulingTypes = useMemo(
    () => Object.keys(displayRulingCounts) as RulingType[],
    [displayRulingCounts],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const expandAll = () => setExpandedIds(new Set(displayList.map((f) => f.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const pinnedFatwas = pinnedIds
    .map((id) => fatwas.find((f) => f.id === id))
    .filter((f): f is Fatwa => Boolean(f));

  const singleExpanded = expandedIds.size === 1 ? [...expandedIds][0] : null;

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

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/35">Filter</span>
        <button
          type="button"
          onClick={() => setRulingFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            rulingFilter === 'all'
              ? 'bg-gold-300/20 text-gold-100 ring-1 ring-gold-300/40'
              : 'bg-white/[0.05] text-white/50 hover:bg-white/10'
          }`}
        >
          All ({fatwas.length})
        </button>
        {rulingTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setRulingFilter(type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              rulingFilter === type
                ? 'bg-gold-300/20 text-gold-100 ring-1 ring-gold-300/40'
                : 'bg-white/[0.05] text-white/50 hover:bg-white/10'
            }`}
          >
            {RULING_FILTER_LABEL[type]} ({displayRulingCounts[type] ?? 0})
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={expandAll} className="btn-ghost !py-1.5 !text-xs">
          Expand all
        </button>
        <button type="button" onClick={collapseAll} className="btn-ghost !py-1.5 !text-xs">
          Collapse all
        </button>
        <span className="self-center text-xs text-white/35">Pin any two maraji for side-by-side text</span>
      </div>

      {pinnedFatwas.length === 2 && (
        <SideBySidePanel
          a={pinnedFatwas[0]}
          b={pinnedFatwas[1]}
          questionEn={question.questionEn}
          onClear={() => setPinnedIds([])}
        />
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayList.map((f) => (
          <FatwaCard
            key={f.id}
            fatwa={f}
            questionSlug={question.slug}
            questionEn={question.questionEn}
            expanded={expandedIds.has(f.id)}
            pinned={pinnedIds.includes(f.id)}
            onToggleExpand={() => toggleExpand(f.id)}
            onTogglePin={() => togglePin(f.id)}
            spotlight={singleExpanded === f.id && expandedIds.size === 1}
          />
        ))}
      </div>

      {displayList.length === 0 && (
        <p className="mt-6 text-sm text-white/45">No answers for this ruling filter.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/compare/${question.slug}`} className="btn-gold !py-2 !text-sm">
          Full comparison page
        </Link>
        <Link href={`/masail/${question.slug}`} className="btn-ghost !py-2 !text-sm">
          Read full answers
        </Link>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllCards(true)}
            className="btn-ghost !py-2 !text-sm"
          >
            Show all {filtered.length} answers here
          </button>
        )}
        {hiddenCount > 0 && !showAllCards && (
          <span className="self-center text-xs text-white/40">+{hiddenCount} more in grid</span>
        )}
      </div>
    </section>
  );
}
