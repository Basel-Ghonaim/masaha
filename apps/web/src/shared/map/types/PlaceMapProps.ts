import type { MapPoint } from './MapPoint';

export type PlaceMapProps = {
  /** The place, at the map's centre. */
  point: MapPoint;
  /** The pin's accessible name, as a picture. */
  label: string;
  /** The line shown when the map cannot load, its tiles or its code. */
  failed: string;
};
