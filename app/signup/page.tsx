'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { AuthShell, Field, FormError } from '@/app/components/AuthShell';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const strength = Math.min(
    (password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0) + (/\d/.test(password) ? 1 : 0) + (/[^\w]/.test(password) ? 1 : 0),
    4,
  );
  const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const STRENGTH_COLORS = ['bg-red-500', 'bg-red-400', 'bg-gold-400', 'bg-emerald-400', 'bg-emerald-400'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setLoading(true);
    try {
      const result = await signUp(email, password);
      router.push(result === 'signed-in' ? '/chat' : `/login?check-email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your conversations and revisit what you've studied."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-gold-200 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="At least 8 characters"
            required
          />
          {password && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-1 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i < strength ? STRENGTH_COLORS[strength] : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-white/40">{STRENGTH_LABELS[strength]}</span>
            </div>
          )}
        </div>

        <Field
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          placeholder="Re-enter your password"
          required
        />

        <button
          type="submit"
          disabled={loading || !email || !password || !confirmPassword}
          className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>
    </AuthShell>
  );
}
