'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/app/components/ChatMessage';
import { ChatInput } from '@/app/components/ChatInput';
import { MarjaCompareGrid } from '@/app/components/MarjaCompareGrid';
import type { CompareSummary, RulingType } from '@/lib/fiqh/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: FiqhCitation[];
  primaryCompare?: CompareSummary | null;
}

interface FiqhCitation {
  id: string;
  questionSlug: string;
  marjaName: string;
  questionEn?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  rulingType?: RulingType;
}

const SUGGESTIONS = [
  'What is the ruling on music in the home?',
  'Khums on unused savings — when is it due?',
  'Can I break fast for a medical test?',
  'Compare maraji on cryptocurrency trading',
];

const THINKING_STAGES = [
  'Reading your question…',
  'Searching fiqh questions…',
  'Loading marja answers…',
  'Comparing rulings…',
  'Drafting answer with citations…',
];

const STAGE_MS = 2200;

const GREETING: Message = {
  id: '0',
  role: 'assistant',
  content:
    'السلام عليكم\n\nAsk about Shia fiqh masail. I answer from the comparative fatwa corpus and cite marja sources — not from hadith collections.',
  citations: [],
};

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastUserRef = useRef<HTMLDivElement>(null);

  const scrollThread = (top: number) => scrollerRef.current?.scrollTo({ top, behavior: 'smooth' });

  const showLatest = () => {
    const scroller = scrollerRef.current;
    const anchor = lastUserRef.current;
    if (!scroller || !anchor) return;
    scrollThread(anchor.offsetTop - scroller.offsetTop - 12);
  };

  useEffect(() => {
    showLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setStage(0);
      return;
    }
    const id = setInterval(() => setStage((s) => Math.min(s + 1, THINKING_STAGES.length - 1)), STAGE_MS);
    return () => clearInterval(id);
  }, [isLoading]);

  const hasAsked = messages.some((m) => m.role === 'user');

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to get response');
      }
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          primaryCompare: data.primaryCompare ?? null,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            error instanceof Error && error.message.includes('GEMINI')
              ? 'Set GEMINI_API_KEY in .env.local to enable AI answers.'
              : 'Something went wrong. Check Supabase + fiqh seed, then try again.',
          citations: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-5xl flex-col px-5 sm:px-8">
      <div className="flex items-center justify-between border-b border-white/10 py-5">
        <div>
          <p className="eyebrow">Fiqh assistant</p>
          <h1 className="mt-2.5 font-display text-3xl font-bold text-white">Ask the maraji corpus</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/search" className="btn-ghost !px-4 !py-2 text-xs">
            Search
          </Link>
          <button
            onClick={() => {
              setMessages([GREETING]);
              scrollThread(0);
            }}
            className="btn-ghost !px-4 !py-2 text-xs"
          >
            New chat
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto py-8">
        {messages.map((message, i) => {
          const isLastQuestion = message.role === 'user' && !messages.slice(i + 1).some((m) => m.role === 'user');
          return (
            <div key={message.id} ref={isLastQuestion ? lastUserRef : undefined}>
              <ChatMessage
                role={message.role}
                content={message.content}
                citations={message.citations}
                onCitationClick={(c) => {
                  if (c.questionSlug) router.push(`/masail/${c.questionSlug}`);
                }}
              />
              {message.role === 'assistant' &&
                message.primaryCompare &&
                message.primaryCompare.fatwas.length > 1 && (
                  <div className="mb-8 max-w-4xl sm:ml-[3.25rem]">
                    <MarjaCompareGrid
                      data={message.primaryCompare}
                      title="Marja answers for this topic"
                      maxCards={8}
                    />
                  </div>
                )}
            </div>
          );
        })}

        {messages.length === 1 && !isLoading && (
          <div className="mt-8 flex flex-wrap gap-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSendMessage(s)}
                className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 transition hover:border-gold-300/40 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-200" fill="currentColor">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
              </svg>
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="text-sm text-white/45">{THINKING_STAGES[stage]}</span>
            </div>
          </div>
        )}

        {hasAsked && <div className="h-[55vh]" aria-hidden />}
      </div>

      <div className="-mx-5 sm:-mx-8">
        <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
