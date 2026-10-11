import type { MapBounds } from './MapBounds';
import type { MapPoint } from './MapPoint';

export type PointPickerProps = {
  /** The pin, or null before one is placed: the map then shows none. */
  value: MapPoint | null;
  /** A click on the map, or the pin dragged, hands back the point. */
  onChange: (point: MapPoint) => void;
  /** Where the map opens, fitted; the view is held near it. */
  bounds: MapBounds;
  /** The map's accessible name, saying what a click does. */
  label: string;
};
