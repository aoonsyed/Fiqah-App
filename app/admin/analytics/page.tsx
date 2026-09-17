'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { isAdminEmail } from '@/lib/admin-auth';
import { BarChart, DonutChart, AreaChart } from '@/app/components/Charts';
import { Reveal, CountUp } from '@/app/components/Reveal';

interface Stats {
  totalBooks: number;
  totalHadiths: number;
  totalChunks: number;
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  activeUsers?: number;
}

const REFRESH_MS = 30_000;

export default function AdminAnalytics() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const authorized = !!user && isAdminEmail(user.email);

  useEffect(() => {
    if (!loading && !authorized) router.push('/login');
  }, [authorized, loading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data: Stats = await response.json();
      setStats(data);
      setHistory((h) => [...h.slice(-23), data.totalMessages]);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_MS);
    return () => clearInterval(interval);
  }, [authorized, fetchStats]);

  if (loading || !authorized) {
    return (
      <div className="grid min-h-[calc(100vh-5rem)] place-items-center">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="text-sm text-white/45">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  const kpis = stats
    ? [
        { label: 'Registered users', value: stats.totalUsers, icon: '👥', accent: 'text-emerald-350' },
        { label: 'Active (24h)', value: stats.activeUsers ?? 0, icon: '⚡', accent: 'text-gold-300' },
        { label: 'Conversations', value: stats.totalConversations, icon: '💬', accent: 'text-sky-400' },
        { label: 'Messages', value: stats.totalMessages, icon: '✉️', accent: 'text-violet-400' },
      ]
    : [];

  const corpus = stats
    ? [
        { label: 'Books', value: stats.totalBooks, color: '#4ade9f' },
        { label: 'Narrations', value: stats.totalHadiths, color: '#efcd6b' },
        { label: 'Chunks', value: stats.totalChunks, color: '#38bdf8' },
      ]
    : [];

  const engagement = stats
    ? [
        { label: 'Conversations', value: stats.totalConversations, color: '#4ade9f' },
        { label: 'Messages', value: stats.totalMessages, color: '#efcd6b' },
        { label: 'Users', value: stats.totalUsers, color: '#38bdf8' },
      ]
    : [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Admin
            </Link>
            <h1 className="section-title mt-4">Analytics</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live · refreshes every 30s
            </span>
            <button onClick={fetchStats} className="btn-ghost !px-4 !py-2 text-xs">
              Refresh now
            </button>
          </div>
        </div>
      </Reveal>

      {error && (
        <div className="mt-10 rounded-2xl border border-red-400/25 bg-red-500/10 p-5">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {loadingStats && !stats ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        stats && (
          <>
            {/* KPI row */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi, i) => (
                <Reveal key={kpi.label} delay={i * 80}>
                  <div className="card p-6">
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{kpi.icon}</span>
                      <span className={`text-[10px] uppercase tracking-[0.14em] ${kpi.accent}`}>live</span>
                    </div>
                    <p className="mt-5 font-display text-4xl font-bold text-white tabular-nums">
                      <CountUp value={kpi.value} />
                    </p>
                    <p className="mt-1.5 text-xs uppercase tracking-[0.12em] text-white/40">{kpi.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Charts */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Reveal>
                <div className="card p-8">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-xl font-bold text-white">Corpus volume</h2>
                    <span className="text-xs text-white/35">books · narrations · chunks</span>
                  </div>
                  <div className="mt-8">
                    <BarChart data={corpus} height={240} />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={110}>
                <div className="card h-full p-8">
                  <h2 className="font-display text-xl font-bold text-white">Engagement mix</h2>
                  <p className="mt-2 text-xs text-white/40">Relative share of recorded activity</p>
                  <div className="mt-8">
                    <DonutChart data={engagement} />
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Trend + table */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Reveal>
                <div className="card h-full p-8">
                  <h2 className="font-display text-xl font-bold text-white">Message volume</h2>
                  <p className="mt-2 text-xs text-white/40">
                    Sampled every 30s this session · {history.length} point{history.length === 1 ? '' : 's'}
                  </p>
                  <div className="mt-8">
                    {history.length > 1 ? (
                      <AreaChart points={history} />
                    ) : (
                      <div className="grid h-[150px] place-items-center rounded-xl border border-dashed border-white/12">
                        <p className="text-xs text-white/35">Collecting samples…</p>
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={110}>
                <div className="card h-full p-8">
                  <h2 className="font-display text-xl font-bold text-white">System breakdown</h2>
                  <div className="mt-7 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Metric</th>
                          <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Count</th>
                          <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { k: 'Books indexed', v: stats.totalBooks },
                          { k: 'Narrations parsed', v: stats.totalHadiths },
                          { k: 'Embedded chunks', v: stats.totalChunks },
                          { k: 'Registered users', v: stats.totalUsers },
                          { k: 'Conversations', v: stats.totalConversations },
                          { k: 'Messages exchanged', v: stats.totalMessages },
                        ].map((row) => (
                          <tr key={row.k} className="border-b border-white/6 last:border-0">
                            <td className="py-3.5 text-white/65">{row.k}</td>
                            <td className="py-3.5 text-right font-semibold tabular-nums text-white">
                              {row.v.toLocaleString()}
                            </td>
                            <td className="py-3.5 text-right">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  row.v > 0
                                    ? 'bg-emerald-400/12 text-emerald-300'
                                    : 'bg-white/8 text-white/40'
                                }`}
                              >
                                {row.v > 0 ? 'Healthy' : 'Empty'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>
            </div>

            {updatedAt && (
              <p className="mt-8 text-center text-xs text-white/30">
                Last updated {updatedAt.toLocaleTimeString()}
              </p>
            )}
          </>
        )
      )}
    </main>
  );
}
