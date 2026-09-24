import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-night-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <p className="font-display text-xl font-bold text-white">Fiqah</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/45">
            Comparative Shia fiqh — masail, maraji, Qibla, and Jafari prayer times.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link href="/search" className="text-white/50 transition hover:text-emerald-800">
            Search
          </Link>
          <Link href="/chat" className="text-white/50 transition hover:text-emerald-800">
            Ask
          </Link>
          <Link href="/prayer-times" className="text-white/50 transition hover:text-emerald-800">
            Salah
          </Link>
          <Link href="/qibla" className="text-white/50 transition hover:text-emerald-800">
            Qibla
          </Link>
        </div>
      </div>
      <div className="border-t border-white/8 px-5 py-4 text-center text-xs text-white/35 sm:px-8">
        © {new Date().getFullYear()} Fiqah
      </div>
    </footer>
  );
}
