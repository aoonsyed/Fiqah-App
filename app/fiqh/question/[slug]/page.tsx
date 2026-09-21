'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import { RulingBadge } from '@/app/components/RulingBadge';
import type { Fatwa, FiqhQuestion } from '@/lib/fiqh/types';

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
          setFatwas(data.fatwas ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

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
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/compare/${question.slug}`} className="btn-gold !py-2 !text-sm">
                Compare all maraji
              </Link>
            </div>
          </Reveal>

          <section className="mt-12 space-y-4">
            {fatwas.map((f, i) => (
              <Reveal key={f.id} delay={i * 40}>
                <article className="card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-white">{f.marja?.nameEn ?? 'Marja'}</h2>
                    <RulingBadge type={f.rulingType} />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/65">{f.answerEn}</p>
                  {f.conditionsEn && (
                    <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/50">
                      Conditions: {f.conditionsEn}
                    </p>
                  )}
                </article>
              </Reveal>
            ))}
          </section>

          {fatwas.some((f) => {
            const ref = f.evidenceRefs?.[0] as { type?: string } | undefined;
            return ref?.type === 'generated_corpus' || ref?.type === 'comparative_seed';
          }) && (
            <p className="mt-10 text-xs text-white/35">
              Some marja entries are comparative seeds — verify on each marja&apos;s official risalah or site.
            </p>
          )}
        </>
      ) : null}
    </main>
  );
}
