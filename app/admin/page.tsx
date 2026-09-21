'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { isAdminEmail } from '@/lib/admin-auth';
import { Reveal } from '@/app/components/Reveal';

interface StatsPayload {
  ready: boolean;
  stats: {
    questions: number;
    fatwas: number;
    maraji: number;
    subcategories: number;
    principles: number;
  } | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StatsPayload | null>(null);

  const authorized = !!user && isAdminEmail(user.email);

  useEffect(() => {
    if (!authLoading && !authorized) router.push('/login');
  }, [authorized, authLoading, router]);

  useEffect(() => {
    if (!authorized) return;
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, [authorized]);

  if (authLoading || !authorized) {
    return (
      <div className="grid min-h-[calc(100vh-5rem)] place-items-center">
        <p className="text-white/50">Checking access…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <Reveal>
        <p className="eyebrow">Admin</p>
        <h1 className="section-title mt-5">Fiqh corpus</h1>
        <p className="mt-4 text-white/50">Seed and monitor the comparative fiqh database in Supabase.</p>
      </Reveal>

      <Reveal delay={80}>
        <div className="card mt-10 space-y-4 p-8 text-sm text-white/60">
          <p className="font-semibold text-white">Setup</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Run SQL: <code className="text-gold-100">lib/fiqh/migrations/003_fiqh_corpus.sql</code></li>
            <li>Seed: <code className="text-gold-100">npm run fiqh:seed -- sample</code></li>
            <li>Probe: <code className="text-gold-100">npm run db:probe</code></li>
          </ol>
          <p className="text-xs text-white/40">
            Hadith import and RAG ingestion are disabled in this fiqh-only build. Drop old hadith tables in Supabase
            if you no longer need that data.
          </p>
        </div>
      </Reveal>

      {stats && (
        <Reveal delay={120}>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ['Questions', stats.stats?.questions ?? 0],
              ['Fatwas', stats.stats?.fatwas ?? 0],
              ['Maraji', stats.stats?.maraji ?? 0],
              ['Topics', stats.stats?.subcategories ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="card p-5">
                <dt className="text-xs uppercase tracking-wide text-white/40">{label}</dt>
                <dd className="mt-2 font-display text-2xl font-bold text-white tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {!stats.ready && (
            <p className="mt-6 text-sm text-amber-100/80">Corpus not seeded or fiqh tables missing.</p>
          )}
        </Reveal>
      )}

      <Reveal delay={160}>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/api/health" className="btn-ghost">
            API health
          </Link>
          <Link href="/" className="btn-gold">
            Open site
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
