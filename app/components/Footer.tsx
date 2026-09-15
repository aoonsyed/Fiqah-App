import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { href: '/chat', label: 'Ask a question' },
      { href: '/search', label: 'Search hadiths' },
      { href: '/qibla', label: 'Qibla finder' },
      { href: '/prayer-times', label: 'Prayer times' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Create account' },
      { href: '/admin', label: 'Admin panel' },
      { href: '/admin/analytics', label: 'Analytics' },
    ],
  },
  {
    title: 'System',
    links: [
      { href: '/api/health', label: 'API health' },
      { href: '/admin/dashboard', label: 'Corpus stats' },
      { href: '/api/hadith/daily', label: 'Daily hadith' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-white/10 bg-night-800">
      <div className="pattern-girih absolute inset-0 opacity-40" />
      <div className="absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-800">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold-200" fill="currentColor">
                  <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
                </svg>
              </span>
              <span className="font-display text-xl font-bold text-white">Nūr</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/50">
              A verified library of Shia hadith, searchable in plain language — every answer traced back to its chain of
              narration.
            </p>
            <p className="mt-6 font-arabic text-2xl text-gold-300/80" dir="rtl">
              وَقُل رَّبِّ زِدْنِي عِلْمًا
            </p>
            <p className="mt-1 text-xs italic text-white/35">&ldquo;My Lord, increase me in knowledge.&rdquo;</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300/80">{col.title}</h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
                    >
                      <span className="h-px w-0 bg-gold-300 transition-all duration-300 group-hover:w-3" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Nūr Hadith Library. Built for seekers of knowledge.</p>
          <p className="flex items-center gap-2 text-xs text-white/40">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Jafari calculation · Live corpus
          </p>
        </div>
      </div>
    </footer>
  );
}
