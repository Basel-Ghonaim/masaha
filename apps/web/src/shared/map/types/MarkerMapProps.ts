import type { ReactNode } from 'react';
import type { MapBounds } from './MapBounds';
import type { MapMark } from './MapMark';
import type { MapPoint } from './MapPoint';

/** A place on the map of many marks: its point, how its mark is drawn, and its names. */
export type MapMarker = {
  id: number;
  point: MapPoint;
  mark: MapMark;
  /** The mark's accessible name, as a button. */
  label: string;
  /** The name shown beside the selected mark, and beside any on hover. */
  name: { text: string; lang?: 'ar' | 'en' };
};

/** What a map's overlay may ask of it. */
export type MarkerMapControls = {
  /** The point at the map's centre now. */
  centre: () => MapPoint;
  /** Brings the visitor's point into view. */
  showUser: () => void;
  /** Moves the focus to the selected mark, as when its card closes. */
  focusSelected: () => void;
  /** Moves the focus to the map, whose arrow keys pan it, as when a point is to be picked. */
  focusMap: () => void;
};

export type MarkerMapProps = {
  markers: MapMarker[];
  selectedId: number | null;
  /** A mark clicked, or pressed with Enter or Space. */
  onSelect: (id: number) => void;
  /** Where the map opens, fitted; the view is held near it. */
  bounds: MapBounds;
  /** The visitor's point, a picture named by `label`. */
  user: { point: MapPoint; label: string } | null;
  /** A point brought into view; `upper` puts it above the centre, clear of a bottom sheet. */
  focus: { point: MapPoint; place: 'centre' | 'upper' } | null;
  /**
   * Picking a point: a crosshair at the centre, the marks out of the tab order and not selectable;
   * a tap places the point too. `keys` says how the keyboard moves the map, read with it.
   */
  pick: { onPick: (point: MapPoint) => void; keys: string } | null;
  /** After each move, the box in view; none when the caller does not ask. */
  onViewChange: ((bounds: MapBounds) => void) | null;
  /** The map's accessible name. */
  label: string;
  /** The line shown when the map cannot load, its tiles or its code. */
  failed: string;
  /**
   * Drawn over the map, in the page's direction, and before its marks in the tab order; its parts
   * take the pointer back.
   */
  overlay: (map: MarkerMapControls) => ReactNode;
  /** Drawn under the map, outside it, with the same controls, as what must not hide its centre. */
  under: ((map: MarkerMapControls) => ReactNode) | null;
};
