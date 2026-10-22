import type { MapBounds } from '@shared/map';

/** The box in view as the map's read takes it: `south,west,north,east`. */
export function boundsText({ south, west, north, east }: MapBounds): string {
  return [south, west, north, east].join(',');
}
