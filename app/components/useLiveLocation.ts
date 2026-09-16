'use client';

import { useEffect, useRef, useState } from 'react';
import { distanceMeters } from '@/lib/qibla';

export interface LiveLocation {
  lat: number;
  lng: number;
  /** Radius of uncertainty in metres, as reported by the device. */
  accuracy: number;
  updatedAt: number;
}

export type LocationStatus = 'locating' | 'tracking' | 'denied' | 'unsupported';

/**
 * Tracks the device position continuously via watchPosition, so the Qibla and
 * prayer times follow you as you move rather than freezing at the fix taken
 * when the page loaded.
 *
 * Small updates are ignored: a stationary GPS drifts by a few metres constantly,
 * and re-rendering on every jitter would make the needle twitch.
 */
export function useLiveLocation({ minMoveMeters = 25 } = {}) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>('locating');
  const last = useRef<LiveLocation | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const next: LiveLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          updatedAt: timestamp,
        };

        const previous = last.current;
        const moved = previous ? distanceMeters(previous.lat, previous.lng, next.lat, next.lng) : Infinity;

        if (moved >= minMoveMeters) {
          last.current = next;
          setLocation(next);
        }
        setStatus('tracking');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unsupported'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [minMoveMeters]);

  return { location, status };
}
