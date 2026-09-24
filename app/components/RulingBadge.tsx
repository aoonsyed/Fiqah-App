import type { RulingType } from '@/lib/fiqh/types';

const STYLES: Record<RulingType, string> = {
  wajib: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  mustahab: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
  mubah: 'border-white/20 bg-white/10 text-white/75',
  makruh: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
  haram: 'border-rose-400/45 bg-rose-500/15 text-rose-100',
  conditional: 'border-violet-400/40 bg-violet-500/15 text-violet-100',
  informational: 'border-gold-300/35 bg-gold-300/10 text-gold-100',
  disputed: 'border-orange-400/40 bg-orange-500/15 text-orange-100',
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
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[type]}`}
    >
      {LABELS[type]}
    </span>
  );
}
