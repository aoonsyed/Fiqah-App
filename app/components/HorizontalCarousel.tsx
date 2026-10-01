'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HorizontalCarouselProps {
  children: React.ReactNode;
  /** Accessible name for the scroll region, e.g. "Topics". */
  label: string;
  /** Auto-advance interval; 0 = off. Never runs for readers who prefer reduced motion. */
  autoMs?: number;
  className?: string;
  itemClassName?: string;
}

export function HorizontalCarousel({
  children,
  label,
  autoMs = 0,
  className = '',
  itemClassName = 'min-w-[85%] sm:min-w-[calc(50%-0.5rem)] lg:min-w-[calc(33.333%-0.67rem)] snap-start',
}: HorizontalCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });
  const childArray = Array.isArray(children) ? children : [children];

  const step = useCallback(() => {
    const el = scroller.current;
    const first = el?.querySelector<HTMLElement>('[data-carousel-item]');
    return first ? first.offsetWidth + 16 : (el?.clientWidth ?? 320) * 0.85;
  }, []);

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 8, end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 8 });
  }, []);

  const scrollBy = useCallback(
    (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * step(), behavior: 'smooth' }),
    [step],
  );

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  useEffect(() => {
    if (!autoMs || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      const el = scroller.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollBy(1);
    }, autoMs);
    return () => clearInterval(id);
  }, [autoMs, paused, scrollBy]);

  const arrow =
    'absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-night-900/90 text-lg text-white/75 shadow-lg backdrop-blur transition hover:border-gold-300/50 hover:text-gold-200 disabled:pointer-events-none disabled:opacity-0 sm:grid';

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-night-900 to-transparent transition-opacity sm:w-20 ${
          edges.start ? 'opacity-0' : ''
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-night-900 to-transparent transition-opacity sm:w-20 ${
          edges.end ? 'opacity-0' : ''
        }`}
      />

      <button type="button" aria-label={`Previous ${label}`} onClick={() => scrollBy(-1)} disabled={edges.start} className={`${arrow} left-1`}>
        ‹
      </button>
      <button type="button" aria-label={`More ${label}`} onClick={() => scrollBy(1)} disabled={edges.end} className={`${arrow} right-1`}>
        ›
      </button>

      <div
        ref={scroller}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={updateEdges}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') scrollBy(1);
          if (e.key === 'ArrowLeft') scrollBy(-1);
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 pt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {childArray.map((child, i) => (
          <div key={i} data-carousel-item className={itemClassName}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
