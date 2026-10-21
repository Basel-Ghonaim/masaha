import { markClass } from '../services/markClass';
import type { MapMark } from '../types/MapMark';

/**
 * A mark drawn as the map draws it, for a legend beside its word. Its classes are `leaflet.css`'s,
 * which arrives with the map, so it is drawn in a map's overlay.
 */
export function MapMarkSample({ mark }: { mark: MapMark }) {
  return (
    <span aria-hidden className={markClass(mark, false)}>
      <span />
    </span>
  );
}
