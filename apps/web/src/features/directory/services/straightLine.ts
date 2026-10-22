import type { Location } from '@masaha/shared/spaces';

/** The Earth's mean radius, as the server's distance takes it. */
const EARTH_RADIUS_METRES = 6_371_000;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The great-circle distance in metres between two points (the haversine formula), the one the
 * server orders the directory by, so a space's page says the distance its card said.
 */
export function straightLine(from: Location, to: Location): number {
  const lat = radians(to.lat - from.lat);
  const lng = radians(to.lng - from.lng);
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lng / 2) ** 2;
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(a));
}
