'use client';

import React, { useEffect } from 'react';

interface Grading {
  grade: string;
  gradedBy?: string;
  gradingSource?: string;
}

interface Hadith {
  id: string;
  hadithNumber: string;
  isnadRaw: string;
  matnArabic: string;
  matnTranslation?: string;
  gradings?: Grading[];
  sourceUrl?: string;
  bookTitle: string;
  chapterTitle: string;
}

export function CitationModal({ hadith, onClose }: { hadith: Hadith | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!hadith) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-night-900/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl animate-fade-up overflow-y-auto rounded-3xl border border-white/12 bg-night-800 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-night-800/95 p-7 backdrop-blur-xl">
          <div>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-350">
              {hadith.bookTitle}
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">Hadith {hadith.hadithNumber}</h2>
            <p className="mt-1 text-sm text-white/40">{hadith.chapterTitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 text-white/50 transition hover:border-white/25 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-7 p-7">
          {hadith.isnadRaw?.trim() && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300/80">
                Chain of narrators · Isnad
              </h3>
              <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 font-arabic text-sm leading-loose text-white/65">
                {hadith.isnadRaw}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300/80">Text</h3>
            <p className="mt-3 font-arabic text-xl leading-loose text-gold-100/90" dir="rtl">
              {hadith.matnArabic}
            </p>
          </section>

          {hadith.matnTranslation && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300/80">Translation</h3>
              <p className="mt-3 leading-relaxed text-white/70">{hadith.matnTranslation}</p>
            </section>
          )}

          {hadith.gradings && hadith.gradings.length > 0 && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300/80">
                Gradings
                {hadith.gradings.length > 1 && (
                  <span className="ml-2 normal-case tracking-normal text-white/35">
                    scholars differ on this narration
                  </span>
                )}
              </h3>
              <ul className="mt-3 space-y-2">
                {hadith.gradings.map((g, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-gold-300/20 bg-gold-300/[0.06] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-arabic text-lg text-gold-100">{g.grade}</span>
                      {g.gradedBy && <span className="text-xs text-white/50">{g.gradedBy}</span>}
                    </div>
                    {g.gradingSource && (
                      <p className="mt-1 text-[11px] italic text-white/35">{g.gradingSource}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hadith.sourceUrl && (
            <a
              href={hadith.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gold-200 hover:underline"
            >
              View at source
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
