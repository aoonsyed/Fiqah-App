import type { RulingType } from '@/lib/fiqh/types';

const STYLES: Record<RulingType, string> = {
  wajib: 'border-emerald-800/30 bg-emerald-950 text-emerald-800',
  mustahab: 'border-sky-600/25 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  mubah: 'border-white/15 bg-white/5 text-white/60',
  makruh: 'border-amber-700/30 bg-amber-500/10 text-amber-900',
  haram: 'border-rose-600/30 bg-rose-500/10 text-rose-800',
  conditional: 'border-white/15 bg-white/5 text-white/65',
  informational: 'border-gold-300/30 bg-gold-300/10 text-gold-200',
  disputed: 'border-orange-600/30 bg-orange-500/10 text-orange-900',
};

const LABELS: Record<RulingType, string> = {
  wajib: 'Wajib',
  mustahab: 'Mustahab',
  mubah: 'Mubah',
  makruh: 'Makruh',
  haram: 'Haram',
  conditional: 'Conditional',
  informational: 'Guidance',
  disputed: 'Disputed',
};

export function RulingBadge({ type }: { type: RulingType }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${STYLES[type]}`}
    >
      {LABELS[type]}
    </span>
  );
}
