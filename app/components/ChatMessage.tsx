'use client';

import React from 'react';

interface Citation {
  id: string;
  hadithId?: string;
  bookTitle: string;
  chapterTitle: string;
  hadithNumber: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: Citation) => void;
}

export function ChatMessage({ role, content, citations = [], onCitationClick }: ChatMessageProps) {
  const isUser = role === 'user';

  const parseContent = (text: string) =>
    text.split(/(\[\[citation:\d+\]\])/g).map((part, idx) => {
      const match = part.match(/\[\[citation:(\d+)\]\]/);
      const citation = match ? citations[parseInt(match[1]) - 1] : undefined;

      if (match && citation) {
        return (
          <button
            key={idx}
            onClick={() => onCitationClick?.(citation)}
            title={`${citation.bookTitle} — ${citation.chapterTitle}`}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-gold-300/40 bg-gold-300/15 px-1.5 align-baseline text-[11px] font-bold text-gold-200 transition hover:bg-gold-300 hover:text-night-900"
          >
            {match[1]}
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });

  return (
    <div className={`mb-7 flex gap-4 animate-fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold shadow-lg ${
          isUser
            ? 'bg-white/10 text-white shadow-black/30'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-800 text-gold-200 shadow-emerald-900/40'
        }`}
      >
        {isUser ? (
          'You'.charAt(0)
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
          </svg>
        )}
      </span>

      <div
        className={`max-w-2xl rounded-2xl border px-5 py-4 ${
          isUser
            ? 'border-gold-300/25 bg-gradient-to-br from-gold-300/12 to-transparent'
            : 'border-white/10 bg-white/[0.04] backdrop-blur-xl'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed text-white/85">{parseContent(content)}</p>

        {!isUser && citations.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300/80">Sources</p>
            <ul className="mt-3 space-y-2">
              {citations.map((cit, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => onCitationClick?.(cit)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition hover:border-gold-300/35 hover:bg-white/[0.07]"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-gold-300/15 text-[10px] font-bold text-gold-200">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white/80">{cit.bookTitle}</span>
                      <span className="block truncate text-[11px] text-white/40">
                        {cit.chapterTitle} · Hadith {cit.hadithNumber}
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-gold-200"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
