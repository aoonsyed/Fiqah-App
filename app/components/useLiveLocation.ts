'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { distanceMeters } from '@/lib/qibla';

export interface LiveLocation {
  lat: number;
  lng: number;
  /** Radius of uncertainty in metres, as reported by the device. 0 for a chosen city. */
  accuracy: number;
  updatedAt: number;
  source: 'gps' | 'manual';
  /** Set for a chosen city; GPS fixes are named separately via usePlaceName. */
  name?: string;
}

export type ManualPlace = Pick<LiveLocation, 'lat' | 'lng' | 'name'>;

export type LocationStatus =
  | 'locating'
  | 'tracking'
  | 'manual'
  | 'denied'
  /** Permission granted but no fix (indoors, GPS off, timeout). */
  | 'unavailable'
  | 'unsupported';

const STORAGE_KEY = 'nur:manual-location';
/** Every hook instance listens, so choosing a city on one card updates the others. */
const CHANGE_EVENT = 'nur:location-change';

function readManual(): LiveLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;
    return { lat: p.lat, lng: p.lng, name: p.name, accuracy: 0, updatedAt: Date.now(), source: 'manual' };
  } catch {
    return null; // storage blocked or corrupt — fall back to GPS
  }
}

function writeManual(place: ManualPlace | null) {
  try {
    if (place) localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked — the choice still applies for this page view */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: place }));
}

/**
 * Where the user is, for Qibla and prayer times.
 *
 * GPS is tracked continuously via watchPosition so results follow you as you
 * move. When GPS is refused or unavailable — common on desktops — a city can be
 * chosen instead; that choice is remembered and takes precedence until the user
 * switches back to device location.
 *
 * Small GPS updates are ignored: a stationary receiver drifts by a few metres
 * constantly, and re-rendering on every jitter would make the needle twitch.
 */
export function useLiveLocation({ minMoveMeters = 25 } = {}) {
  const [manual, setManual] = useState<LiveLocation | null>(null);
  const [manualLoaded, setManualLoaded] = useState(false);
  const [gps, setGps] = useState<LiveLocation | null>(null);
  const [gpsStatus, setGpsStatus] = useState<LocationStatus>('locating');
  const last = useRef<LiveLocation | null>(null);

  // localStorage is read after mount so server and client render the same markup.
  useEffect(() => {
    setManual(readManual());
    setManualLoaded(true);

    const onChange = (e: Event) => {
      const place = (e as CustomEvent<ManualPlace | null>).detail;
      setManual(place ? { ...place, accuracy: 0, updatedAt: Date.now(), source: 'manual' } : null);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const usingManual = manual !== null;

  useEffect(() => {
    // Wait for the stored choice, and don't prompt for GPS the user has opted out of.
    if (!manualLoaded || usingManual) return;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    setGpsStatus('locating');
    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const next: LiveLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          updatedAt: timestamp,
          source: 'gps',
        };

        const previous = last.current;
        const moved = previous ? distanceMeters(previous.lat, previous.lng, next.lat, next.lng) : Infinity;

        if (moved >= minMoveMeters) {
          last.current = next;
          setGps(next);
        }
        setGpsStatus('tracking');
      },
      (err) => {
        // A later fix may still arrive after a timeout, so keep any location we have.
        if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied');
        else setGpsStatus((s) => (s === 'tracking' ? s : 'unavailable'));
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [manualLoaded, usingManual, minMoveMeters]);

  const chooseLocation = useCallback((place: ManualPlace) => writeManual(place), []);
  const useDeviceLocation = useCallback(() => writeManual(null), []);

  return {
    location: manual ?? gps,
    status: usingManual ? ('manual' as const) : gpsStatus,
    chooseLocation,
    useDeviceLocation,
  };
}

/** Human-readable name for a position, e.g. "Lahore, Punjab, Pakistan". */
export function usePlaceName(location: LiveLocation | null): string | null {
  const [name, setName] = useState<string | null>(null);

  // ~1 km grid: the name doesn't change with GPS jitter, so neither does the request.
  const lat = location ? location.lat.toFixed(2) : null;
  const lng = location ? location.lng.toFixed(2) : null;
  const given = location?.name;

  useEffect(() => {
    if (given) {
      setName(given);
      return;
    }
    if (lat === null || lng === null) {
      setName(null);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setName(data?.name ?? null))
      .catch(() => {});
    return () => controller.abort();
  }, [lat, lng, given]);

  return name;
}
