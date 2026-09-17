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
  /** The source the user selected. */
  mode: LocationSource | null;
  onChoose: (place: ManualPlace) => void;
  onUseDevice: () => void;
  onUseIp: () => void;
}

const LABELS: Record<LocationStatus, string> = {
  locating: 'Finding your location…',
  ip: 'Approximate · from your IP address',
  tracking: 'Precise · device GPS',
  manual: 'Chosen city',
  denied: 'GPS denied · using your IP address',
  unavailable: 'Location needed',
};

/**
 * Shows where Qibla and prayer times are being computed for, and lets the user
 * pick a city when GPS is refused, unavailable, or simply wrong.
 */
export function LocationPicker({ location, status, placeName, mode, onChoose, onUseDevice, onUseIp }: LocationPickerProps) {
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

  // Debounced so typing a city name costs one request, not one per keystroke.
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

  const label = status === 'denied' && !location ? 'GPS denied' : LABELS[status];

  return (
    <div className="card mx-auto max-w-2xl p-5 hover:!translate-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
              status === 'tracking' || status === 'ip'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                : status === 'manual'
                  ? 'border-gold-300/40 bg-gold-300/10 text-gold-200'
                  : 'border-white/15 bg-white/5 text-white/50'
            }`}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
            <p className="truncate text-sm font-semibold text-white/85">
              {location
                ? (placeName ?? `${location.lat.toFixed(3)}°, ${location.lng.toFixed(3)}°`)
                : needsChoice
                  ? 'We could not find your location. Search for your city.'
                  : '—'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {mode !== 'ip' && (
            <button type="button" onClick={onUseIp} className="btn-ghost !px-3.5 !py-2 text-xs">
              Use IP location
            </button>
          )}
          {mode !== 'gps' && (
            <button type="button" onClick={onUseDevice} className="btn-ghost !px-3.5 !py-2 text-xs">
              Use precise GPS
            </button>
          )}
          {!needsChoice && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="btn-ghost !px-3.5 !py-2 text-xs"
              aria-expanded={open}
            >
              {open ? 'Cancel' : 'Change'}
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <label htmlFor="city-search" className="sr-only">
            Search for a city
          </label>
          <input
            id="city-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a city, e.g. Karachi, Najaf, London"
            autoComplete="off"
            className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold-300/50 focus:outline-none"
          />

          {searching && <p className="mt-3 text-xs text-white/40">Searching…</p>}
          {searchFailed && <p className="mt-3 text-xs text-red-300">Search is unavailable right now. Try again shortly.</p>}
          {!searching && !searchFailed && query.trim().length >= 2 && results.length === 0 && (
            <p className="mt-3 text-xs text-white/40">No places found.</p>
          )}

          {results.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/80 transition hover:border-gold-300/35 hover:bg-white/[0.07]"
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-white/35">
                      {r.lat.toFixed(2)}°, {r.lng.toFixed(2)}°
                    </span>
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
