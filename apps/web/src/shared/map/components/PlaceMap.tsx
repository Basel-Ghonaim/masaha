import { Skeleton } from '@shared/design-system';
import { lazy, Suspense } from 'react';
import type { PlaceMapProps } from '../types/PlaceMapProps';
import { MapFailed } from './MapFailed';

// Leaflet and its stylesheet load with the map, never before (docs/frontend/architecture.md §6).
// When its code cannot be fetched, as offline, the map says so in the caller's words.
const LeafletPlaceMap = lazy(() =>
  import('./LeafletPlaceMap').then(
    ({ LeafletPlaceMap: map }) => ({ default: map }),
    () => ({ default: ({ failed }: PlaceMapProps) => <MapFailed line={failed} /> }),
  ),
);

/**
 * One place on a map (docs/frontend/architecture.md §6): centred on `point`, the layer's pin on it,
 * a picture named by `label`, never a button and never dragged (PU-026). While the map loads, a
 * placeholder of its size stands in.
 */
export function PlaceMap(props: PlaceMapProps) {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
      <LeafletPlaceMap {...props} />
    </Suspense>
  );
}
