'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { ThemeToggle } from '@/app/components/ThemeProvider';

const LINKS = [
  { href: '/search', label: 'Search' },
  { href: '/chat', label: 'Ask' },
  { href: '/prayer-times', label: 'Salah' },
  { href: '/qibla', label: 'Qibla' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-white/10 bg-night-800/95 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight text-white">
          Fiqah
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-medium transition ${
                  active ? 'text-emerald-800' : 'text-white/55 hover:text-white'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-emerald-500" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <button onClick={() => signOut()} className="text-sm text-white/50 hover:text-white">
              Sign out
            </button>
          ) : (
            <Link href="/chat" className="btn-gold !py-2 !text-xs">
              Ask fiqh
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-white/12"
            aria-label="Menu"
          >
            <span className="flex w-4 flex-col gap-1">
              <span className={`h-px w-full bg-white transition ${open ? 'translate-y-1.5 rotate-45' : ''}`} />
              <span className={`h-px w-full bg-white transition ${open ? 'opacity-0' : ''}`} />
              <span className={`h-px w-full bg-white transition ${open ? '-translate-y-1.5 -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-night-800 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                  pathname === link.href ? 'bg-emerald-950 text-emerald-800' : 'text-white/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link href="/chat" className="btn-gold mt-2 !py-2.5 text-center">
                Ask fiqh
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
