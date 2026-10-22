import type { MapMark } from '../types/MapMark';

/**
 * The layer's classes for a mark (`leaflet.css`): its shape and its tone, and a ring when selected,
 * never a fill, so the selected mark keeps its state's shape.
 */
export function markClass({ shape, tone }: MapMark, selected: boolean): string {
  const classes = `map-mark map-mark-${shape} map-tone-${tone}`;
  return selected ? `${classes} map-mark-selected` : classes;
}
