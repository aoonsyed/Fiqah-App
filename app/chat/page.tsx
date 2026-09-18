'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/app/components/ChatMessage';
import { ChatInput } from '@/app/components/ChatInput';
import { RequireAuth } from '@/app/components/RequireAuth';
import { useHadithViewer } from '@/app/components/useHadithViewer';
import { useRouter } from 'next/navigation';
import { AuthRequiredError, authFetch, loginUrl } from '@/lib/auth-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

const SUGGESTIONS = [
  'What does al-Kafi say about seeking knowledge?',
  'Narrations on the rights of parents',
  'How is Fajr defined in Jafari fiqh?',
  'Hadiths narrated by Zurara ibn A’yan',
];

/**
 * Shown while a question is being answered. Retrieval really does run in these
 * stages, so the lines track what the server is doing rather than inventing
 * activity; they simply advance on a timer because the API answers in one go.
 */
const THINKING_STAGES = [
  'Reading your question…',
  'Searching 77,000 narrations…',
  'Gathering the closest matches…',
  'Weighing which narrations actually answer this…',
  'Checking chains and gradings…',
  'Writing the answer with its citations…',
];

const STAGE_MS = 2600;

const GREETING: Message = {
  id: '0',
  role: 'assistant',
  content:
    'السلام عليكم\n\nAsk me anything about the Shia hadith corpus. I answer only from narrations I can find, and every claim comes with its source.',
  citations: [],
};

export default function ChatPage() {
  return (
    <RequireAuth>
      <Chat />
    </RequireAuth>
  );
}

function Chat() {
  const router = useRouter();
  const { open: openHadith, viewer } = useHadithViewer();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastUserRef = useRef<HTMLDivElement>(null);

  // The thread scrolls inside its own panel. scrollIntoView would scroll the
  // whole window too, dragging the page down past the composer to the footer.
  const scrollThread = (top: number) => scrollerRef.current?.scrollTo({ top, behavior: 'smooth' });

  /**
   * Bring the newest exchange to the top of the panel rather than jumping to
   * the end, so a long answer starts where it can be read from its first line.
   */
  const showLatest = () => {
    const scroller = scrollerRef.current;
    const anchor = lastUserRef.current;
    // Nothing asked yet: stay at the greeting instead of jumping past it.
    if (!scroller || !anchor) return;
    scrollThread(anchor.offsetTop - scroller.offsetTop - 12);
  };

  useEffect(() => {
    showLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isLoading]);

  // Advance the status line while waiting, holding on the last one.
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
      const response = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: data.answer, citations: data.citations },
      ]);
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        router.push(loginUrl('/chat'));
        return;
      }
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Something went wrong reaching the library. Please try again.',
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
          <p className="eyebrow">Grounded answers</p>
          <h1 className="mt-2.5 font-display text-3xl font-bold text-white">Ask the library</h1>
        </div>
        <button
          onClick={() => {
            setMessages([GREETING]);
            scrollThread(0); // the panel keeps its offset otherwise
          }}
          className="btn-ghost !px-4 !py-2 text-xs"
        >
          New conversation
        </button>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto py-8">
        {messages.map((message, i) => {
          // Anchor on the last question asked, so it sits at the top of the panel.
          const isLastQuestion = message.role === 'user' && !messages.slice(i + 1).some((m) => m.role === 'user');
          return (
            <div key={message.id} ref={isLastQuestion ? lastUserRef : undefined}>
              <ChatMessage
                role={message.role}
                content={message.content}
                citations={message.citations}
                onCitationClick={(c: any) => openHadith(c.hadithId)}
              />
            </div>
          );
        })}

        {messages.length === 1 && !isLoading && (
          <div className="mt-8 flex flex-wrap gap-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSendMessage(s)}
                className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 transition hover:border-gold-300/40 hover:bg-white/[0.07] hover:text-white"
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
              <span className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold-300"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
              <span className="text-sm text-white/45 transition-opacity duration-300">{THINKING_STAGES[stage]}</span>
            </div>
          </div>
        )}

        {/* Room to scroll the newest exchange up to the top of the panel.
            Only once a question exists, or the opening view starts scrollable. */}
        {hasAsked && <div className="h-[55vh]" aria-hidden />}
      </div>

      <div className="-mx-5 sm:-mx-8">
        <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} />
      </div>

      {viewer}
    </div>
  );
}
