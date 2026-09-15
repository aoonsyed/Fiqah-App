'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, isLoading = false, placeholder = 'Ask about a hadith, a ruling, a narrator…' }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) handleSubmit(e as any);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/10 bg-night-900/80 p-4 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl">
        <div className="group flex items-end gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-2.5 transition-colors focus-within:border-gold-300/45">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-200 to-gold-400 text-night-900 transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/25"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] text-white/30">
          Enter to send · Shift + Enter for a new line · Answers are grounded in the indexed corpus
        </p>
      </div>
    </form>
  );
}
