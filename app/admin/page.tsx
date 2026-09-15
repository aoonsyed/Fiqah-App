'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, supabase } from '@/app/components/AuthProvider';
import { isAdminEmail } from '@/lib/admin-auth';
import { Field } from '@/app/components/AuthShell';
import { Reveal } from '@/app/components/Reveal';

interface IngestionStatus {
  success?: boolean;
  message?: string;
  error?: string;
  bookId?: string;
  docType?: string;
  hadiths_created?: number;
  chunks_indexed?: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [docType, setDocType] = useState('auto');
  const [language, setLanguage] = useState('ar');
  const [status, setStatus] = useState<IngestionStatus | null>(null);

  const authorized = !!user && isAdminEmail(user.email);

  useEffect(() => {
    if (!authLoading && !authorized) router.push('/login');
  }, [authorized, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookTitle', title);
      formData.append('author', author || 'Unknown');
      formData.append('language', language);
      if (docType !== 'auto') formData.append('docType', docType);

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const response = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await response.json();
      setStatus(data);

      if (data.success) {
        setFile(null);
        setTitle('');
        setAuthor('');
      }
    } catch (error) {
      setStatus({ error: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !authorized) {
    return (
      <div className="grid min-h-[calc(100vh-5rem)] place-items-center">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold-300" />
          <p className="text-sm text-white/45">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Restricted area</p>
            <h1 className="section-title mt-5">Admin Panel</h1>
            <p className="mt-4 text-white/50">Ingest new books and monitor the corpus.</p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 text-xs font-bold text-gold-200">
              {user.email.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs text-white/55">{user.email}</span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={90} className="mt-12">
        <div className="card p-8">
          <h2 className="font-display text-2xl font-bold text-white">Ingest a book</h2>
          <p className="mt-2 text-sm text-white/45">
            The file is extracted, parsed into narrations, chunked, embedded, and indexed.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                setFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                dragging ? 'border-gold-300/60 bg-gold-300/5' : 'border-white/15 hover:border-white/25'
              }`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={loading}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-white/25" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v13" />
              </svg>
              {file ? (
                <>
                  <p className="mt-4 font-semibold text-gold-200">{file.name}</p>
                  <p className="mt-1 text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB · click to replace</p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-sm font-semibold text-white/75">Drop a file here, or click to browse</p>
                  <p className="mt-1 text-xs text-white/35">PDF, DOCX, or TXT</p>
                </>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Book title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Al-Kafi vol. 1"
                disabled={loading}
              />
              <Field
                label="Author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Al-Kulayni"
                disabled={loading}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                  Document type
                </span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm text-white focus:border-gold-300/50 focus:outline-none disabled:opacity-50"
                >
                  <option className="bg-night-800" value="auto">
                    Detect automatically
                  </option>
                  <option className="bg-night-800" value="hadith">
                    Hadith collection (with isnad)
                  </option>
                  <option className="bg-night-800" value="masail">
                    Fiqh manual (numbered masail)
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                  Language
                </span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm text-white focus:border-gold-300/50 focus:outline-none disabled:opacity-50"
                >
                  <option className="bg-night-800" value="ar">Arabic</option>
                  <option className="bg-night-800" value="ur">Urdu</option>
                  <option className="bg-night-800" value="en">English</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !file || !title}
              className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Ingesting…
                </>
              ) : (
                'Ingest book'
              )}
            </button>
          </form>

          {status && (
            <div
              className={`mt-6 rounded-xl border p-4 ${
                status.success
                  ? 'border-emerald-400/30 bg-emerald-500/10'
                  : 'border-red-400/25 bg-red-500/10'
              }`}
            >
              <p className={`text-sm font-semibold ${status.success ? 'text-emerald-200' : 'text-red-200'}`}>
                {status.message || status.error}
              </p>
              {status.success && status.hadiths_created ? (
                <p className="mt-1 text-xs text-emerald-300/80">
                  {status.hadiths_created} {status.docType === 'masail' ? 'rulings' : 'narrations'} ·{' '}
                  {status.chunks_indexed} chunks embedded
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Reveal>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {[
          {
            href: '/admin/analytics',
            title: 'Analytics',
            desc: 'Active users, conversations, and engagement over time.',
            icon: 'M3 3v18h18M7 15l4-5 4 3 5-7',
          },
          {
            href: '/admin/dashboard',
            title: 'Corpus statistics',
            desc: 'Books, narrations, and embedded chunks in the index.',
            icon: 'M4 7h16M4 12h10M4 17h7',
          },
        ].map((card, i) => (
          <Reveal key={card.href} delay={i * 90}>
            <Link href={card.href} className="card group block h-full p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 transition group-hover:border-gold-300/40">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold-200" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={card.icon} />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-white/45">{card.desc}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
