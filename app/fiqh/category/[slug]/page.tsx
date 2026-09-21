'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import type { FiqhCategory, FiqhQuestion } from '@/lib/fiqh/types';
import { CATEGORIES } from '@/lib/fiqh/catalog';

export default function FiqhCategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [category, setCategory] = useState<FiqhCategory | null>(null);
  const [questions, setQuestions] = useState<FiqhQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const catalog = CATEGORIES.find((c) => c.slug === slug);
    if (catalog) {
      setCategory({
        id: catalog.slug,
        slug: catalog.slug,
        nameEn: catalog.nameEn,
        nameAr: catalog.nameAr,
        descriptionEn: catalog.descriptionEn,
        orderIndex: catalog.orderIndex,
      });
    }

    fetch(`/api/fiqh/questions?category=${encodeURIComponent(slug)}&limit=50`)
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((data) => setQuestions(data.questions ?? []))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!category && !loading) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-white/60">Category not found.</p>
        <Link href="/fiqh" className="btn-ghost mt-6 inline-block">
          Back to fiqh
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <Reveal>
        <Link href="/" className="text-sm text-gold-200 hover:underline">
          ← All domains
        </Link>
        <h1 className="section-title mt-6">{category?.nameEn}</h1>
        {category?.descriptionEn && <p className="mt-4 text-white/50">{category.descriptionEn}</p>}
      </Reveal>

      {loading ? (
        <div className="card mt-10 h-48 animate-pulse" />
      ) : questions.length === 0 ? (
        <p className="mt-10 text-sm text-white/45">
          No questions loaded for this domain yet. Seed the corpus or pick another category.
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {questions.map((q, i) => (
            <Reveal key={q.id} delay={i * 25}>
              <li>
                <Link
                  href={`/masail/${q.slug}`}
                  className="card block p-5 text-sm text-white/85 hover:border-gold-300/35"
                >
                  {q.questionEn}
                </Link>
              </li>
            </Reveal>
          ))}
        </ul>
      )}
    </main>
  );
}
