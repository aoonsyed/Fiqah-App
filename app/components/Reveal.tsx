'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True when the element starts below the visible viewport, so hiding it can't be seen. */
function startsOffscreen(el: Element): boolean {
  return el.getBoundingClientRect().top > window.innerHeight;
}

/**
 * Fades content in as it scrolls into view.
 *
 * Server HTML is always visible: only elements that start below the fold are
 * hidden (after hydration, where the reader can't see it happen) and then
 * revealed on scroll. Content above the fold never blinks out and back in.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'shown' | 'pending' | 'revealed'>('shown');

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !startsOffscreen(el)) return;

    setState('pending');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${state === 'pending' ? 'reveal-pending' : ''} ${className}`}
      style={state === 'revealed' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * A number that counts up when scrolled into view. Renders the real value on
 * the server and above the fold, so the page never shows "0" first.
 */
export function CountUp({ value, duration = 1600 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !startsOffscreen(el)) {
      setDisplay(value);
      return;
    }

    setDisplay(0);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString('en-US')}</span>;
}
