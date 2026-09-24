'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveLocation, LocationSource, LocationStatus, ManualPlace } from './useLiveLocation';

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  location: LiveLocation | null;
  status: LocationStatus;
  placeName: string | null;
  mode: LocationSource | null;
  onChoose: (place: ManualPlace) => void;
  onUseDevice: () => void;
  onUseIp: () => void;
  /** Compact chip style for embedded worship layouts */
  variant?: 'bar' | 'chip';
}

const LABELS: Record<LocationStatus, string> = {
  locating: 'Finding location…',
  ip: 'Approx. from IP',
  tracking: 'GPS',
  manual: 'Chosen city',
  denied: 'GPS denied · IP',
  unavailable: 'Location needed',
};

export function LocationPicker({
  location,
  status,
  placeName,
  mode,
  onChoose,
  onUseDevice,
  onUseIp,
  variant = 'chip',
}: LocationPickerProps) {
  const needsChoice = !location && (status === 'unavailable' || status === 'denied');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSearch = open || needsChoice;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchFailed(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('search failed'))))
        .then((data) => {
          setResults(data.results ?? []);
          setSearchFailed(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setSearchFailed(true);
        })
        .finally(() => setSearching(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (r: SearchResult) => {
    onChoose({ lat: r.lat, lng: r.lng, name: r.name });
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const place =
    location
      ? (placeName ?? `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`)
      : needsChoice
        ? 'Search your city'
        : '—';

  return (
    <div className={variant === 'chip' ? 'relative' : 'relative w-full'}>
      <div
        className={`flex flex-wrap items-center gap-2 ${
          variant === 'chip'
            ? 'rounded-full border border-white/10 bg-black/25 px-3 py-1.5 backdrop-blur-md'
            : 'rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3'
        }`}
      >
        <span
          className={`grid shrink-0 place-items-center rounded-full ${
            variant === 'chip' ? 'h-7 w-7' : 'h-8 w-8'
          } ${
            status === 'tracking' || status === 'ip'
              ? 'bg-emerald-500/20 text-emerald-300'
              : status === 'manual'
                ? 'bg-gold-300/15 text-gold-200'
                : 'bg-white/5 text-white/45'
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white/90">{place}</p>
          {variant === 'bar' && (
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{LABELS[status]}</p>
          )}
        </div>

        {variant === 'chip' && (
          <span className="hidden text-[10px] uppercase tracking-wider text-white/35 sm:inline">
            {LABELS[status]}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {mode !== 'gps' && (
            <button
              type="button"
              onClick={onUseDevice}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
              title="Use precise GPS"
            >
              GPS
            </button>
          )}
          {mode !== 'ip' && (
            <button
              type="button"
              onClick={onUseIp}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              IP
            </button>
          )}
          {!needsChoice && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-gold-100 transition hover:bg-white/15"
              aria-expanded={open}
            >
              {open ? 'Close' : 'City'}
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div
          className={`mt-2 overflow-hidden rounded-2xl border border-white/12 bg-night-900/95 p-3 shadow-2xl backdrop-blur-xl ${
            variant === 'chip' ? 'absolute left-0 right-0 z-20 sm:left-auto sm:right-0 sm:w-80' : ''
          }`}
        >
          <label htmlFor="city-search" className="sr-only">
            Search for a city
          </label>
          <input
            id="city-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Karachi, Najaf, London…"
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold-300/40 focus:outline-none"
          />

          {searching && <p className="mt-2 text-xs text-white/40">Searching…</p>}
          {searchFailed && <p className="mt-2 text-xs text-rose-300">Search unavailable.</p>}
          {!searching && !searchFailed && query.trim().length >= 2 && results.length === 0 && (
            <p className="mt-2 text-xs text-white/40">No places found.</p>
          )}

          {results.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition hover:bg-white/8"
                  >
                    <span className="truncate">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
