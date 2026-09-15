'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Reveal, CountUp } from '@/app/components/Reveal';

interface Stats {
  totalBooks: number;
  totalHadiths: number;
  totalChunks: number;
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
}

const CARDS: { key: keyof Stats; label: string; hint: string; color: string }[] = [
  { key: 'totalBooks', label: 'Books', hint: 'Collections ingested', color: '#4ade9f' },
  { key: 'totalHadiths', label: 'Narrations', hint: 'Hadiths indexed', color: '#efcd6b' },
  { key: 'totalChunks', label: 'Chunks', hint: 'Embedded text segments', color: '#38bdf8' },
  { key: 'totalUsers', label: 'Users', hint: 'Registered accounts', color: '#a78bfa' },
  { key: 'totalConversations', label: 'Conversations', hint: 'Chat sessions started', color: '#f472b6' },
  { key: 'totalMessages', label: 'Messages', hint: 'Total messages exchanged', color: '#fb923c' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error loading stats'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <Reveal>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Admin
        </Link>
        <h1 className="section-title mt-4">Corpus statistics</h1>
        <p className="mt-4 text-white/50">A snapshot of what&rsquo;s currently indexed and in use.</p>
      </Reveal>

      {error && (
        <div className="mt-10 rounded-2xl border border-red-400/25 bg-red-500/10 p-5">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
            ))
          : stats &&
            CARDS.map((card, i) => (
              <Reveal key={card.key} delay={i * 70}>
                <div className="card group p-7">
                  <span
                    className="block h-1 w-10 rounded-full transition-all duration-500 group-hover:w-16"
                    style={{ background: card.color, boxShadow: `0 0 18px -2px ${card.color}` }}
                  />
                  <p className="mt-6 font-display text-5xl font-bold text-white tabular-nums">
                    <CountUp value={stats[card.key]} />
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white/80">{card.label}</p>
                  <p className="mt-1 text-xs text-white/35">{card.hint}</p>
                </div>
              </Reveal>
            ))}
      </div>

      <Reveal className="mt-12 flex flex-wrap gap-4">
        <Link href="/admin" className="btn-gold">
          Ingest a book
        </Link>
        <Link href="/admin/analytics" className="btn-ghost">
          Full analytics
        </Link>
        <Link href="/search" className="btn-ghost">
          Search the corpus
        </Link>
      </Reveal>
    </main>
  );
}
