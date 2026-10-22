import type { MapBounds } from '@shared/map';

/** Hundredths of a degree: about 1 km, so a box never carries a point to the metre. */
const STEP = 100;

// Scaled first and trimmed of the float's noise, so a bound already in hundredths stays as it is.
const scaled = (degrees: number) => Number((degrees * STEP).toFixed(6));
const down = (degrees: number) => Math.floor(scaled(degrees)) / STEP;
const up = (degrees: number) => Math.ceil(scaled(degrees)) / STEP;

/**
 * The box in view as the map's read takes it: `south,west,north,east`, rounded outward to two
 * decimals, so the box still holds the view, and pans close together share one answer.
 */
export function boundsText({ south, west, north, east }: MapBounds): string {
  return [down(south), down(west), up(north), up(east)].join(',');
}
