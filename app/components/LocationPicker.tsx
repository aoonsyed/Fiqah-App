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
}

const LABELS: Record<LocationStatus, string> = {
  locating: 'Finding…',
  ip: 'From IP',
  tracking: 'GPS',
  manual: 'City',
  denied: 'IP (GPS denied)',
  unavailable: 'Needed',
};

export function LocationPicker({
  location,
  status,
  placeName,
  mode,
  onChoose,
  onUseDevice,
  onUseIp,
}: LocationPickerProps) {
  const needsChoice = !location && (status === 'unavailable' || status === 'denied');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showSearch = open || needsChoice;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const place = location
    ? (placeName ?? `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`)
    : needsChoice
      ? 'Search a city'
      : '—';

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="max-w-[14rem] truncate font-medium text-white/80 sm:max-w-xs">{place}</span>
        <span className="text-white/25">·</span>
        <span className="text-xs text-white/40">{LABELS[status]}</span>
        {mode !== 'gps' && (
          <button type="button" onClick={onUseDevice} className="text-xs font-semibold text-emerald-800 hover:underline">
            GPS
          </button>
        )}
        {mode !== 'ip' && (
          <button type="button" onClick={onUseIp} className="text-xs font-semibold text-emerald-800 hover:underline">
            IP
          </button>
        )}
        {!needsChoice && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            {open ? 'Close' : 'Change'}
          </button>
        )}
      </div>

      {showSearch && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-white/12 bg-night-800 p-3 shadow-lg">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City name…"
            className="w-full rounded-md border border-white/12 bg-night-700 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
          />
          {searching && <p className="mt-2 text-xs text-white/40">Searching…</p>}
          <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChoose({ lat: r.lat, lng: r.lng, name: r.name });
                    setOpen(false);
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full truncate rounded px-2 py-1.5 text-left text-sm text-white/75 hover:bg-white/5"
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
