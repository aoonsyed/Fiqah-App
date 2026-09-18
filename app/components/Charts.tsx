'use client';

export interface Datum {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = ['#4ade9f', '#efcd6b', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c'];

export function BarChart({ data, height = 220 }: { data: Datum[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        // h-full: the bars size by percentage, which needs a resolved parent height.
        <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold tabular-nums text-white/70 transition group-hover:text-gold-200">
            {d.value.toLocaleString()}
          </span>
          <div
            className="w-full min-h-[4px] flex-shrink origin-bottom rounded-t-lg transition-all duration-300 group-hover:brightness-125"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: 4,
              background: `linear-gradient(180deg, ${d.color ?? PALETTE[i % PALETTE.length]}, ${
                d.color ?? PALETTE[i % PALETTE.length]
              }22)`,
              boxShadow: `0 0 24px -6px ${d.color ?? PALETTE[i % PALETTE.length]}`,
              animation: `grow-y .9s cubic-bezier(.22,1,.36,1) ${i * 90}ms both`,
            }}
          />
          <span className="truncate text-[11px] text-white/45">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, size = 190 }: { data: Datum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-7">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="18" />
          {data.map((d, i) => {
            const len = (d.value / total) * circumference;
            const el = (
              <circle
                key={d.label}
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke={d.color ?? PALETTE[i % PALETTE.length]}
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
                className="animate-draw"
                style={{ animationDelay: `${i * 140}ms` }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-white tabular-nums">{total.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">total</p>
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: d.color ?? PALETTE[i % PALETTE.length] }}
            />
            <span className="text-white/60">{d.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-white">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreaChart({ points, height = 150 }: { points: number[]; height?: number }) {
  const max = Math.max(...points, 1);
  const step = 100 / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => [i * step, 40 - (p / max) * 34]);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ height }} className="w-full">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade9f" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4ade9f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,40 L0,40 Z`} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="#4ade9f"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="300"
        strokeDashoffset="300"
        className="animate-draw"
      />
    </svg>
  );
}
