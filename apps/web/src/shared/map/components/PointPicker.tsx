import { Skeleton } from '@shared/design-system';
import { lazy, Suspense } from 'react';
import type { PointPickerProps } from '../types/PointPickerProps';
import { MapFailed } from './MapFailed';

// Leaflet and its stylesheet load with the map, never before (docs/frontend/architecture.md §6).
// When its code cannot be fetched, as offline, the map says so as it does when its tiles fail.
const LeafletPointPicker = lazy(() =>
  import('./LeafletPointPicker').then(
    ({ LeafletPointPicker: picker }) => ({ default: picker }),
    () => ({ default: MapFailed }),
  ),
);

/**
 * A map to place one point on (docs/frontend/architecture.md §6): it opens on `bounds` with no pin
 * until `value` holds one; a click places the pin, a drag moves it, and each hands the point back.
 * While the map loads, a placeholder of its size stands in.
 */
export function PointPicker(props: PointPickerProps) {
  return (
    <Suspense fallback={<Skeleton className="h-100 w-full rounded-lg" />}>
      <LeafletPointPicker {...props} />
    </Suspense>
  );
}
