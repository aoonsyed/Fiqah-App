'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import { FatwaAnswerBody } from '@/app/components/FatwaAnswerBody';
import { MarjaCompareGrid } from '@/app/components/MarjaCompareGrid';
import {
  formatFatwaDisplay,
  pickPrimaryOfficialFatwa,
  type FatwaCorpusKind,
} from '@/lib/fiqh/format-fatwa-display';
import type { CompareSummary, Fatwa, FiqhQuestion } from '@/lib/fiqh/types';

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

export default function FiqhQuestionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [question, setQuestion] = useState<FiqhQuestion | null>(null);
  const [fatwas, setFatwas] = useState<Fatwa[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
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
  }, [slug]);

  const primary = useMemo(() => pickPrimaryOfficialFatwa(fatwas), [fatwas]);
  const primaryDisplay = primary && question ? formatFatwaDisplay(primary, question.questionEn) : null;

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
              ← {question.categorySlug}
            </Link>
            <h1 className="mt-6 font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
              {question.questionEn}
            </h1>
            {question.questionAr && (
              <p className="mt-4 text-lg text-white/55" dir="rtl" lang="ar">
                {question.questionAr}
              </p>
            )}
          </Reveal>

          {primaryDisplay && primary && (
            <Reveal delay={40}>
              <section className="card mt-10 border-gold-300/25 p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">
                  Official ruling (corpus)
                </p>
                <p className="mt-2 text-sm text-white/50">
                  {primary.marja?.nameEn} — verified import. Other maraji below are expanded or aligned until their texts
                  are imported.
                </p>
                <div className="mt-5">
                  <FatwaAnswerBody fatwa={primary} questionEn={question.questionEn} showMarjaHeader />
                </div>
              </section>
            </Reveal>
          )}

          {compareData && (
            <Reveal delay={60}>
              <p className="mt-10 text-sm text-white/45">
                Open any card for the full ruling text. Green highlight = hukm to follow; seeded maraji show aligned
                corpus text until their official answers are imported.
              </p>
              <MarjaCompareGrid data={compareData} title="Compare all maraji" hideQuestionTitle />
            </Reveal>
          )}
        </>
      ) : null}
    </main>
  );
}
