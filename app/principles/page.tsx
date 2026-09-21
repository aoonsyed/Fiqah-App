'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reveal } from '@/app/components/Reveal';
import { LEGAL_PRINCIPLES } from '@/lib/fiqh/catalog';
import type { FiqhPrinciple } from '@/lib/fiqh/types';

export default function PrinciplesPage() {
  const [principles, setPrinciples] = useState<FiqhPrinciple[]>([]);

  useEffect(() => {
    fetch('/api/fiqh/principles')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.principles?.length) setPrinciples(data.principles);
        else setPrinciples(fallback());
      })
      .catch(() => setPrinciples(fallback()));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <Reveal>
        <Link href="/" className="text-sm text-gold-200 hover:underline">
          ← Home
        </Link>
        <h1 className="section-title mt-6">Usul & legal principles</h1>
        <p className="mt-4 text-white/50">Foundational rules applied across fiqh domains.</p>
      </Reveal>

      <ul className="mt-12 space-y-4">
        {principles.map((p, i) => (
          <Reveal key={p.slug} delay={i * 50}>
            <li className="card p-6">
              <h2 className="font-display text-lg font-bold text-white">{p.nameEn}</h2>
              {p.nameAr && (
                <p className="mt-2 text-lg text-white/55" dir="rtl" lang="ar">
                  {p.nameAr}
                </p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-white/60">{p.explanationEn}</p>
            </li>
          </Reveal>
        ))}
      </ul>
    </main>
  );
}

function fallback(): FiqhPrinciple[] {
  return LEGAL_PRINCIPLES.map((p) => ({
    id: p.slug,
    slug: p.slug,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    explanationEn: p.explanationEn,
    explanationAr: null,
    relatedCategorySlugs: p.relatedCategorySlugs,
    orderIndex: p.orderIndex,
  }));
}
