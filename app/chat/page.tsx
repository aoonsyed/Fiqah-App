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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
          onClick={() => setMessages([GREETING])}
          className="btn-ghost !px-4 !py-2 text-xs"
        >
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-8">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            citations={message.citations}
            onCitationClick={(c: any) => openHadith(c.hadithId)}
          />
        ))}

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
              <span className="text-sm text-white/45">Searching the corpus…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="-mx-5 sm:-mx-8">
        <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} />
      </div>

      {viewer}
    </div>
  );
}
