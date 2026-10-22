import type { LatLngBounds, LatLngBoundsExpression } from 'leaflet';
import type { MapBounds } from '../types/MapBounds';

/** A box as Leaflet takes it, its south-west and north-east corners, widened by `margin` of it. */
export function cornersOf(
  { south, north, west, east }: MapBounds,
  margin = 0,
): LatLngBoundsExpression {
  const lat = (north - south) * margin;
  const lng = (east - west) * margin;
  return [
    [south - lat, west - lng],
    [north + lat, east + lng],
  ];
}

/** The box Leaflet holds in view, as the map's callers name a box. */
export function boundsOf(box: LatLngBounds): MapBounds {
  return { south: box.getSouth(), west: box.getWest(), north: box.getNorth(), east: box.getEast() };
}
