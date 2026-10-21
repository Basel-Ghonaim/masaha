import { Skeleton } from '@shared/design-system';
import { lazy, Suspense } from 'react';
import type { MarkerMapProps } from '../types/MarkerMapProps';
import { MapFailed } from './MapFailed';

// Leaflet and its stylesheet load with the map, never before (docs/frontend/architecture.md §6).
// When its code cannot be fetched, as offline, the map says so in the caller's words.
const LeafletMarkerMap = lazy(() =>
  import('./LeafletMarkerMap').then(
    ({ LeafletMarkerMap: map }) => ({ default: map }),
    () => ({ default: ({ failed }: MarkerMapProps) => <MapFailed line={failed} /> }),
  ),
);

/**
 * A map of many places (docs/frontend/architecture.md §6): each a mark the caller draws by shape and
 * tone and names as a button, one of them selected; the visitor's point; a point to pick at the
 * centre; the box in view handed back after each move; the caller's overlay drawn over it, and what
 * it draws under it.
 * While the map loads, a placeholder of its size stands in.
 */
export function MarkerMap(props: MarkerMapProps) {
  return (
    <Suspense fallback={<Skeleton className="h-120 w-full rounded-xl lg:h-160" />}>
      <LeafletMarkerMap {...props} />
    </Suspense>
  );
}
