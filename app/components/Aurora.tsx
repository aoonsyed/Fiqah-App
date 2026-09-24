export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-night-900" />
      <div className="pattern-girih absolute inset-0 opacity-[0.55]" />
      {/* The coloured glows are toned down in light mode (see --aurora-opacity). */}
      <div className="absolute inset-0" style={{ opacity: 'var(--aurora-opacity, 1)' }}>
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-emerald-600/18 blur-[120px] animate-drift" />
      <div
        className="absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-gold-400/12 blur-[120px] animate-drift"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-[120px] animate-drift"
        style={{ animationDelay: '-14s' }}
      />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-night-900/70 via-transparent to-night-900" />
    </div>
  );
}
