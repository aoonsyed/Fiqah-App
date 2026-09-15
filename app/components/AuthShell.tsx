import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-16 px-5 py-16 sm:px-8 lg:grid-cols-2">
      {/* Marketing panel */}
      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/60 via-night-800 to-night-900 p-12">
          <div className="pattern-girih absolute inset-0 opacity-50" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/12 blur-3xl" />
          <div className="relative">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-800">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-gold-200" fill="currentColor">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
              </svg>
            </span>
            <h2 className="mt-8 font-display text-4xl font-bold leading-tight text-white">
              Every answer,
              <br />
              <span className="text-gradient-gold">traced to its source.</span>
            </h2>
            <p className="mt-6 text-white/50">
              Sign in to keep your conversations, revisit the narrations you&rsquo;ve studied, and pick up where you left
              off.
            </p>
            <p className="mt-10 font-arabic text-2xl text-gold-300/70" dir="rtl">
              وَقُل رَّبِّ زِدْنِي عِلْمًا
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Back home
        </Link>

        <h1 className="mt-8 font-display text-4xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-white/45">{subtitle}</p>

        <div className="mt-10">{children}</div>

        <div className="mt-8 text-center text-sm text-white/45">{footer}</div>
      </div>
    </main>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/25 transition-colors focus:border-gold-300/50 focus:outline-none disabled:opacity-50"
      />
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3.5">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-red-300" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <p className="text-sm text-red-200">{message}</p>
    </div>
  );
}
