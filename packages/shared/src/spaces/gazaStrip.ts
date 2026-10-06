/** A point on the map, in degrees. */
export interface Location {
  lat: number;
  lng: number;
}

/**
 * Where a space may be placed: the Gaza Strip's bounding box (about 31.22–31.60 N, 34.22–34.57 E),
 * widened by about 4 km on every side, so a space at the edge of the Strip, or a pin placed a little
 * off, is never refused. The web's map and the API apply the same box.
 */
export const GAZA_STRIP_BOUNDS = { south: 31.18, north: 31.64, west: 34.17, east: 34.62 } as const;

/** Whether the point lies in the Gaza Strip's box, edges included. */
export function isInGazaStrip({ lat, lng }: Location): boolean {
  const { south, north, west, east } = GAZA_STRIP_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
