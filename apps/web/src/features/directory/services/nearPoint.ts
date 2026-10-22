import { NEAR_DECIMALS } from '@masaha/shared/directory';
import { GAZA_STRIP_BOUNDS, isInGazaStrip } from '@masaha/shared/spaces';
import type { NearPoint } from '../types/NearState';

/** A position less precise than this is not used: "near" would mean nothing. */
export const MAX_ACCURACY_METRES = 2000;

const SCALE = 10 ** NEAR_DECIMALS;

/** The point rounded to three decimals (about 110 m), before anything keeps it. */
export function roundedPoint({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): NearPoint {
  return { lat: Math.round(latitude * SCALE) / SCALE, lng: Math.round(longitude * SCALE) / SCALE };
}

/**
 * What near me makes of the device's position: its rounded point, or imprecise when it is less
 * precise than 2 km or its rounded point lies outside the Strip's box. The raw position goes no
 * further.
 */
export function judgePosition(coords: {
  latitude: number;
  longitude: number;
  accuracy: number;
}): { status: 'granted'; point: NearPoint } | { status: 'imprecise' } {
  if (coords.accuracy > MAX_ACCURACY_METRES) return { status: 'imprecise' };
  const point = roundedPoint(coords);
  return isInGazaStrip(point) ? { status: 'granted', point } : { status: 'imprecise' };
}

/**
 * A point placed by hand on the map, rounded as the device's is and held inside the Strip's box,
 * whose edge the map lets the visitor pan a little past.
 */
export function pinnedPoint({ lat, lng }: { lat: number; lng: number }): NearPoint {
  const { south, north, west, east } = GAZA_STRIP_BOUNDS;
  const rounded = roundedPoint({ latitude: lat, longitude: lng });
  return {
    lat: Math.min(Math.max(rounded.lat, south), north),
    lng: Math.min(Math.max(rounded.lng, west), east),
  };
}

/** The `Masaha-Near` header's value: `lat,lng`. */
export function nearHeader(point: NearPoint): string {
  return `${String(point.lat)},${String(point.lng)}`;
}
