'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface HorizontalCarouselProps {
  children: React.ReactNode;
  /** Auto-advance interval; 0 = off */
  autoMs?: number;
  className?: string;
  itemClassName?: string;
}

export function HorizontalCarousel({
  children,
  autoMs = 5000,
  className = '',
  itemClassName = 'min-w-[85%] sm:min-w-[calc(50%-0.5rem)] lg:min-w-[calc(33.333%-0.67rem)] snap-start',
}: HorizontalCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const childArray = Array.isArray(children) ? children : [children];

  const scrollNext = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>('[data-carousel-item]');
    const step = first ? first.offsetWidth + 16 : el.clientWidth * 0.85;
    const max = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft >= max - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.scrollBy({ left: step, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!autoMs || paused) return;
    const id = setInterval(scrollNext, autoMs);
    return () => clearInterval(id);
  }, [autoMs, paused, scrollNext]);

  return (
    <div
      className={`group relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-night-900 to-transparent sm:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-night-900 to-transparent sm:w-20" />

      <button
        type="button"
        aria-label="Previous"
        onClick={() => scroller.current?.scrollBy({ left: -320, behavior: 'smooth' })}
        className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/15 bg-night-900/80 p-2 text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-gold-200 sm:block"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={scrollNext}
        className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/15 bg-night-900/80 p-2 text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-gold-200 sm:block"
      >
        ›
      </button>

      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: 'x mandatory' }}
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
