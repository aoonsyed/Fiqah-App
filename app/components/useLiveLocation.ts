'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { distanceMeters } from '@/lib/qibla';

export type LocationSource = 'ip' | 'gps' | 'manual';

export interface LiveLocation {
  lat: number;
  lng: number;
  /** Radius of uncertainty in metres, as reported by the device. 0 when not from GPS. */
  accuracy: number;
  updatedAt: number;
  source: LocationSource;
  /** Known for IP and chosen-city locations; GPS fixes are named via usePlaceName. */
  name?: string;
}

export type ManualPlace = Pick<LiveLocation, 'lat' | 'lng' | 'name'>;

export type LocationStatus =
  | 'locating'
  /** Approximate, from the IP address (follows a VPN). */
  | 'ip'
  /** Live device GPS. */
  | 'tracking'
  | 'manual'
  /** GPS was requested but refused. */
  | 'denied'
  /** No location could be found by any means. */
  | 'unavailable';

type Mode = { kind: 'ip' } | { kind: 'gps' } | { kind: 'manual'; place: ManualPlace };

const STORAGE_KEY = 'nur:location-mode';
const IP_CACHE_KEY = 'nur:ip-location';
/** Every hook instance listens, so changing the source on one card updates the others. */
const CHANGE_EVENT = 'nur:location-change';

function readMode(): Mode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const m = raw ? JSON.parse(raw) : null;
    if (m?.kind === 'gps') return { kind: 'gps' };
    if (m?.kind === 'manual' && typeof m.place?.lat === 'number' && typeof m.place?.lng === 'number') return m;
  } catch {
    /* storage blocked or corrupt */
  }
  return { kind: 'ip' };
}

function writeMode(mode: Mode) {
  try {
    if (mode.kind === 'ip') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
  } catch {
    /* storage blocked — the choice still applies for this page view */
  }
  window.dispatchEvent(new CustomEvent<Mode>(CHANGE_EVENT, { detail: mode }));
}

/**
 * One lookup per browser session, shared by every card on the page. The IP can
 * change (a VPN toggled), so it isn't kept across sessions.
 */
let ipRequest: Promise<LiveLocation | null> | null = null;

function lookupIpLocation(): Promise<LiveLocation | null> {
  try {
    const cached = sessionStorage.getItem(IP_CACHE_KEY);
    if (cached) return Promise.resolve(JSON.parse(cached));
  } catch {
    /* fall through to a fresh lookup */
  }

  ipRequest ??= fetch('/api/ip-location')
    .then((res) => (res.ok ? res.json() : null))
    .then((d) => {
      if (!d || typeof d.lat !== 'number') return null;
      const loc: LiveLocation = { lat: d.lat, lng: d.lng, name: d.name, accuracy: 0, updatedAt: Date.now(), source: 'ip' };
      try {
        sessionStorage.setItem(IP_CACHE_KEY, JSON.stringify(loc));
      } catch {
        /* not cached — fine */
      }
      return loc;
    })
    .catch(() => null)
    .finally(() => {
      ipRequest = null;
    });

  return ipRequest;
}

/**
 * Where the user is, for Qibla and prayer times.
 *
 * - Default: approximate location from the IP address. No permission prompt,
 *   and it follows a VPN, which is what people travelling or using one expect.
 * - Opt-in GPS: tracked continuously so results follow you as you move. Falls
 *   back to the IP location if refused or unavailable.
 * - A chosen city overrides both until the user switches back.
 *
 * The choice is remembered on this device.
 */
export function useLiveLocation({ minMoveMeters = 25 } = {}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [ipLocation, setIpLocation] = useState<LiveLocation | null>(null);
  const [ipFailed, setIpFailed] = useState(false);
  const [gps, setGps] = useState<LiveLocation | null>(null);
  const [gpsState, setGpsState] = useState<'locating' | 'tracking' | 'denied' | 'unavailable'>('locating');
  const last = useRef<LiveLocation | null>(null);

  // localStorage is read after mount so server and client render the same markup.
  useEffect(() => {
    setMode(readMode());
    const onChange = (e: Event) => setMode((e as CustomEvent<Mode>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const kind = mode?.kind;

  // IP location is fetched in IP mode, and in GPS mode as the fallback.
  useEffect(() => {
    if (kind !== 'ip' && kind !== 'gps') return;
    let cancelled = false;
    lookupIpLocation().then((loc) => {
      if (cancelled) return;
      setIpLocation(loc);
      setIpFailed(!loc);
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    if (kind !== 'gps') return;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsState('unavailable');
      return;
    }

    setGpsState('locating');
    last.current = null;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const next: LiveLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          updatedAt: timestamp,
          source: 'gps',
        };

        // A stationary receiver drifts a few metres constantly; ignore the jitter.
        const previous = last.current;
        const moved = previous ? distanceMeters(previous.lat, previous.lng, next.lat, next.lng) : Infinity;
        if (moved >= minMoveMeters) {
          last.current = next;
          setGps(next);
        }
        setGpsState('tracking');
      },
      (err) => {
        // A later fix may still arrive after a timeout, so keep any location we have.
        if (err.code === err.PERMISSION_DENIED) setGpsState('denied');
        else setGpsState((s) => (s === 'tracking' ? s : 'unavailable'));
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [kind, minMoveMeters]);

  let location: LiveLocation | null = null;
  let status: LocationStatus = 'locating';

  if (mode?.kind === 'manual') {
    location = { ...mode.place, accuracy: 0, updatedAt: 0, source: 'manual' };
    status = 'manual';
  } else if (mode?.kind === 'gps') {
    if (gps && gpsState !== 'denied') {
      location = gps;
      status = 'tracking';
    } else if (gpsState === 'denied' || gpsState === 'unavailable') {
      // GPS failed: carry on with the approximate location rather than nothing.
      location = ipLocation;
      status = gpsState === 'denied' ? 'denied' : ipLocation ? 'ip' : ipFailed ? 'unavailable' : 'locating';
    }
  } else if (mode?.kind === 'ip') {
    location = ipLocation;
    status = ipLocation ? 'ip' : ipFailed ? 'unavailable' : 'locating';
  }

  const chooseLocation = useCallback((place: ManualPlace) => writeMode({ kind: 'manual', place }), []);
  const useDeviceLocation = useCallback(() => writeMode({ kind: 'gps' }), []);
  const useIpLocation = useCallback(() => writeMode({ kind: 'ip' }), []);

  return {
    location,
    status,
    /** The source the user selected, which may differ from location.source after a GPS fallback. */
    mode: kind ?? null,
    chooseLocation,
    useDeviceLocation,
    useIpLocation,
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
