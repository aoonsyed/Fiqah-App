'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { ThemeToggle } from '@/app/components/ThemeProvider';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/chat', label: 'Ask' },
  { href: '/search', label: 'Search' },
  { href: '/qibla', label: 'Qibla' },
  { href: '/prayer-times', label: 'Prayer Times' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? 'border-b border-white/10 bg-night-900/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800 shadow-lg shadow-emerald-900/40">
            <span className="absolute inset-0 rounded-xl border border-gold-300/40" />
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold-200" fill="currentColor">
              <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-wide text-white">Nūr</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-gold-300/70">Hadith Library</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-xl lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  active ? 'text-night-900' : 'text-white/65 hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-200 to-gold-400 shadow-md shadow-gold-500/25" />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/admin"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-sm font-bold text-gold-200 transition hover:border-gold-300/50 hover:bg-white/5"
                title={user.email}
              >
                {user.email.charAt(0).toUpperCase()}
              </Link>
              <button onClick={() => signOut()} className="text-sm font-medium text-white/60 transition hover:text-white">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-white/70 transition hover:text-white">
                Sign in
              </Link>
              <Link href="/chat" className="btn-gold !px-5 !py-2.5">
                Start asking
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10"
            aria-label="Toggle menu"
          >
            <span className="flex w-5 flex-col gap-1.5">
              <span className={`h-0.5 w-full bg-white transition-all duration-300 ${open ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`h-0.5 w-full bg-white transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-full bg-white transition-all duration-300 ${open ? '-translate-y-2 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`overflow-hidden border-t border-white/10 bg-night-900/95 backdrop-blur-xl transition-all duration-500 lg:hidden ${
          open ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                pathname === link.href ? 'bg-gold-300/10 text-gold-200' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-3 border-t border-white/10 pt-4">
            {user ? (
              <button onClick={() => signOut()} className="btn-ghost flex-1 !py-2.5">
                Sign out
              </button>
            ) : (
              <>
                <Link href="/login" className="btn-ghost flex-1 !py-2.5">
                  Sign in
                </Link>
                <Link href="/chat" className="btn-gold flex-1 !py-2.5">
                  Start asking
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
