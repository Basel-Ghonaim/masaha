import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import type { SheetView } from '../../types/SheetView';
import { useAmenitiesQuery } from './useAmenitiesQuery';
import { useAmenityListFailure } from './useAmenityListFailure';

/**
 * The amenities section, ready to render: its state (loading, failed, empty or the list), the
 * amenities in order, retired ones included, the words of each state, the sheet that adds an
 * amenity, the failure of an order, and whether every row waits out a 429 (`blocked`). Each row
 * prepares its own amenity, and its own failure. A failure to load is read as any refusal is, with
 * its line, its request's reference and, for too many requests, the wait, during which the retry
 * waits too.
 */
export function useAmenitiesSection() {
  const copy = useCopy();
  const query = useAmenitiesQuery();
  const amenities = query.data ?? [];
  const list = useAmenityListFailure();
  // A failed refetch keeps the list already loaded: only a list that never arrived is an error.
  const { view, blocked } = useRefusalView(
    query.data === undefined ? query.error : null,
    copy.lookups.amenities.loadFailed,
  );

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : amenities.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    amenities,
    add: {
      trigger: copy.lookups.amenities.add,
      title: copy.lookups.sheet.addAmenity,
      closeLabel: copy.lookups.sheet.close,
    } satisfies SheetView,
    title: copy.lookups.amenities.title,
    description: copy.lookups.amenities.description,
    loadingLabel: copy.status.loading,
    empty: {
      title: copy.lookups.amenities.empty,
      description: copy.lookups.amenities.emptyHint,
    },
    failure: {
      title: copy.lookups.amenities.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    orderFailure: list.failure,
    blocked: list.blocked,
  };
}
