'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { AuthShell, Field, FormError } from '@/app/components/AuthShell';

// useSearchParams needs a Suspense boundary or the page can't be prerendered.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths, so the login page can't be used as an open redirect.
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/chat';
  const checkEmail = searchParams.get('check-email');
  const confirmed = searchParams.has('confirmed');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.replace(next);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === 'email_not_confirmed'
          ? 'Please confirm your email first — open the link we sent you, then sign in.'
          : code === 'invalid_credentials'
            ? 'Email or password is incorrect. If you just signed up, confirm your email first.'
            : err instanceof Error
              ? err.message
              : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your study."
      footer={
        <>
          Don&rsquo;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-gold-200 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {checkEmail && !error && (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Account created. We sent a confirmation link to <strong>{checkEmail}</strong> — open it, then sign in here.
          </p>
        )}
        {confirmed && !error && (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Email confirmed. You can sign in now.
          </p>
        )}
        <FormError message={error} />

        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="you@example.com"
          required
        />

        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthShell>
  );
}
