import { markClass } from '../services/markClass';
import type { MapMark } from '../types/MapMark';

/**
 * A mark drawn as the map draws it, for a legend beside its word. Its classes are `leaflet.css`'s,
 * which arrives with the map, so it is drawn in a map's overlay. Like the map's, it is drawn on the
 * light theme, the tiles' (finding 135).
 */
export function MapMarkSample({ mark }: { mark: MapMark }) {
  return (
    <span aria-hidden className={markClass(mark, false)}>
      <span data-theme="light" />
    </span>
  );
}
