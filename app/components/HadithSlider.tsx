'use client';

import { useEffect, useState } from 'react';

const QUOTES = [
  {
    arabic: 'مَنْ عَمِلَ بِمَا يَعْلَمُ وَرَّثَهُ اللَّهُ عِلْمَ مَا لَمْ يَعْلَمْ',
    text: 'Whoever acts upon what he knows, God will grant him knowledge of what he does not know.',
    source: 'Imam Ja’far al-Sadiq (a)',
    book: 'Bihar al-Anwar',
  },
  {
    arabic: 'الْعِلْمُ خَزَائِنُ وَمَفَاتِيحُهُ السُّؤَالُ',
    text: 'Knowledge is a treasury, and its keys are questions. So ask — for in asking, four are rewarded.',
    source: 'The Prophet Muhammad (s)',
    book: 'al-Kafi',
  },
  {
    arabic: 'لَيْسَ الْعِلْمُ بِكَثْرَةِ التَّعَلُّمِ وَلَكِنَّهُ نُورٌ',
    text: 'Knowledge is not in abundance of learning; rather it is a light God casts into the heart of whom He wills.',
    source: 'Imam Ali (a)',
    book: 'Nahj al-Balagha',
  },
  {
    arabic: 'خَيْرُ النَّاسِ مَنْ نَفَعَ النَّاسَ',
    text: 'The best of people are those who bring the most benefit to others.',
    source: 'The Prophet Muhammad (s)',
    book: 'Man La Yahduruhu al-Faqih',
  },
];

export function HadithSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/50 via-night-800 to-night-900 p-8 sm:p-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pattern-girih absolute inset-0 opacity-50" />
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <svg viewBox="0 0 24 24" className="h-9 w-9 text-gold-300/40" fill="currentColor">
            <path d="M9 7H5a2 2 0 00-2 2v4a2 2 0 002 2h2v2a2 2 0 01-2 2H4v2h1a4 4 0 004-4V7zm11 0h-4a2 2 0 00-2 2v4a2 2 0 002 2h2v2a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V7z" />
          </svg>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
            Curated selection
          </span>
        </div>

        <div className="relative mt-6 min-h-[200px] sm:min-h-[180px]">
          {QUOTES.map((q, i) => (
            <blockquote
              key={i}
              className={`absolute inset-0 transition-all duration-700 ${
                i === index ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
              }`}
            >
              <p className="font-arabic text-2xl leading-loose text-gold-200/90 sm:text-3xl" dir="rtl">
                {q.arabic}
              </p>
              <p className="mt-5 font-display text-xl leading-relaxed text-white/85 sm:text-2xl">
                &ldquo;{q.text}&rdquo;
              </p>
              <footer className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-emerald-350">{q.source}</span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span className="text-white/45">{q.book}</span>
              </footer>
            </blockquote>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2.5">
          {QUOTES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Quote ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? 'w-10 bg-gold-300' : 'w-4 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
