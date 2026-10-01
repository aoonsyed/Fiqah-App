'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import { FatwaAnswerBody, SourceAttribution } from '@/app/components/FatwaAnswerBody';
import { MarjaCompareGrid } from '@/app/components/MarjaCompareGrid';
import {
  formatFatwaDisplay,
  pickPrimaryOfficialFatwa,
  type FatwaCorpusKind,
} from '@/lib/fiqh/format-fatwa-display';
import { questionHeading } from '@/lib/fiqh/question-heading';
import type { CompareSummary, Fatwa, FiqhQuestion } from '@/lib/fiqh/types';

/** "usul-principles" → "Usul principles" */
function categoryLabel(slug: string): string {
  const words = slug.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function corpusKind(refs: unknown[]): FatwaCorpusKind {
  const t = (refs[0] as { type?: string } | undefined)?.type;
  if (t === 'comparative_seed') return 'comparative_seed';
  if (t === 'generated_corpus') return 'generated_corpus';
  return 'imported';
}

function sortFatwas(fatwas: Fatwa[]): Fatwa[] {
  const rank = (f: Fatwa) => {
    const k = corpusKind(f.evidenceRefs ?? []);
    if (k === 'imported') {
      if (f.marja?.slug === 'khamenei') return 0;
      if (f.marja?.slug === 'sistani') return 1;
      return 2;
    }
    if (k === 'comparative_seed') return 3;
    return 4;
  };
  return [...fatwas].sort((a, b) => rank(a) - rank(b));
}

/**
 * A masail page. Normally rendered with server-fetched data (so the ruling is in
 * the HTML for readers and search engines); fetches on the client only when the
 * server couldn't reach the database.
 */
export function QuestionView({
  slug,
  initial,
}: {
  slug: string;
  initial?: { question: FiqhQuestion; fatwas: Fatwa[] };
}) {
  const [question, setQuestion] = useState<FiqhQuestion | null>(initial?.question ?? null);
  const [fatwas, setFatwas] = useState<Fatwa[]>(() => sortFatwas(initial?.fatwas ?? []));
  const [loading, setLoading] = useState(!initial);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (initial) return;
    fetch(`/api/fiqh/questions/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (data) {
          setQuestion(data.question);
          setFatwas(sortFatwas(data.fatwas ?? []));
        }
      })
      .finally(() => setLoading(false));
  }, [slug, initial]);

  const primary = useMemo(() => pickPrimaryOfficialFatwa(fatwas), [fatwas]);
  const primaryDisplay = primary && question ? formatFatwaDisplay(primary, question.questionEn) : null;
  const heading = useMemo(() => (question ? questionHeading(question.questionEn) : null), [question]);

  const compareData: CompareSummary | null = useMemo(() => {
    if (!question || fatwas.length === 0) return null;
    const rulingCounts = {} as Record<string, number>;
    for (const f of fatwas) {
      const rt = formatFatwaDisplay(f, question?.questionEn).displayRuling;
      rulingCounts[rt] = (rulingCounts[rt] ?? 0) + 1;
    }
    const entries = Object.entries(rulingCounts).sort((a, b) => b[1] - a[1]);
    const dominant = entries[0]?.[0] as CompareSummary['agreement']['dominantRuling'];
    return {
      question,
      fatwas,
      agreement: {
        rulingCounts: rulingCounts as CompareSummary['agreement']['rulingCounts'],
        dominantRuling: dominant ?? null,
        unanimous: entries.length <= 1,
      },
    };
  }, [question, fatwas]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-white/60">Question not found.</p>
        <Link href="/" className="btn-ghost mt-6 inline-block">
          Browse fiqh
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      {loading ? (
        <div className="card h-56 animate-pulse" />
      ) : question ? (
        <>
          <Reveal>
            <Link href={`/topics/${question.categorySlug ?? 'worship'}`} className="text-sm text-gold-200 hover:underline">
              ← {categoryLabel(question.categorySlug ?? 'worship')}
            </Link>
            {heading?.label && (
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">{heading.label}</p>
            )}
            <h1
              dir="auto"
              className={`font-display font-bold leading-snug text-white ${heading?.label ? 'mt-2' : 'mt-6'} ${
                (heading?.heading.length ?? 0) > 100 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {heading?.heading ?? question.questionEn}
            </h1>
            {primaryDisplay && primary ? (
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
                <span>
                  Ruling of <span className="font-semibold text-white">{primary.marja?.nameEn ?? 'the marja'}</span>
                </span>
                <span className="text-white/25">·</span>
                <SourceAttribution source={primaryDisplay.source} />
              </p>
            ) : (
              fatwas.length > 0 && (
                <p className="mt-4 rounded-lg border border-warn/25 bg-warn/[0.06] p-3 text-sm text-warn">
                  No published ruling is in the library for this question yet. The answers below are generated
                  placeholder text, not taken from any marja&apos;s books — check your marja&apos;s risalah.
                </p>
              )
            )}
            {!primary && heading && heading.heading !== question.questionEn && (
              <p className="mt-4 leading-relaxed text-white/70">{question.questionEn}</p>
            )}
            {question.questionAr && (
              <p className="mt-4 text-lg text-white/55" dir="rtl" lang="ar">
                {question.questionAr}
              </p>
            )}
          </Reveal>

          {primaryDisplay && primary && (
            <Reveal delay={40}>
              <section className="card mt-10 border-gold-300/25 p-6 sm:p-8">
                <div>
                  <FatwaAnswerBody fatwa={primary} questionEn={question.questionEn} />
                </div>
              </section>
            </Reveal>
          )}

          {/* With a single answer the grid would only repeat the ruling above. */}
          {compareData && !(fatwas.length === 1 && primary) && (
            <Reveal delay={60}>
              <p className="mt-10 text-sm text-white/45">
                Each card names its source. Cards marked &ldquo;Not a published ruling&rdquo; hold generated
                placeholder text, not that marja&apos;s ruling.
              </p>
              <MarjaCompareGrid data={compareData} title="Compare all maraji" hideQuestionTitle />
            </Reveal>
          )}
        </>
      ) : null}
    </main>
  );
}
