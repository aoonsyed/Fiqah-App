/**
 * Qibla geometry. Pure functions with no I/O, so the same implementation serves
 * the API route and the browser — the client recomputes locally as you move
 * instead of making a round-trip per position update.
 */

/** The Kaaba is a fixed structure; these are constants, not a lookup. */
export const KAABA = { lat: 21.4225, lng: 39.8262 } as const;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Initial great-circle bearing (forward azimuth) to the Kaaba, in degrees
 * clockwise from true north.
 *
 * This is the direction of the shortest path over the sphere, which is not the
 * direction it appears on a flat map: from New York the answer is ~58° (north-
 * east, over Greenland), while a rhumb-line reading of a flat map says
 * south-east and is wrong.
 */
export function qiblaBearing(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lng - lng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function compassDirection(bearing: number): string {
  return POINTS[Math.round(bearing / 22.5) % 16];
}

/** Great-circle (haversine) distance in kilometres. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const distanceToKaabaKm = (lat: number, lng: number) => distanceKm(lat, lng, KAABA.lat, KAABA.lng);

/** Metres between two fixes — used to ignore GPS jitter. */
export const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) =>
  distanceKm(lat1, lng1, lat2, lng2) * 1000;
