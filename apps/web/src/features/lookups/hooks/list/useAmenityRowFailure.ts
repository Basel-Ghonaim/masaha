import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView, type FormFailureView } from '@shared/forms';
import { useMutationState } from '@tanstack/react-query';
import type { AmenityAction } from '../../types/AmenityAction';
import { AMENITY_ACTIONS, amenityActionKindOf } from '../mutationKeys';

/**
 * The failure of the last action on one amenity's row, either of its switches, shown with that row so
 * it names its amenity by where it is. It stands until the next action on that row, whatever fails
 * elsewhere; an order's failure is the list's (`useAmenityListFailure`).
 */
export function useAmenityRowFailure(amenityId: number): FormFailureView | null {
  const copy = useCopy();
  // Every action on this row that is still held, oldest first: only the last one counts.
  const outcomes = useMutationState({
    filters: {
      mutationKey: AMENITY_ACTIONS,
      predicate: (mutation) =>
        amenityActionKindOf(mutation.options.mutationKey) !== 'amenityOrder' &&
        (mutation.state.variables as AmenityAction | undefined)?.amenityId === amenityId,
    },
    select: (mutation) =>
      mutation.state.status === 'error' ? (mutation.state.error as AppError) : null,
  });

  return useRefusalView(outcomes.at(-1) ?? null, copy.lookups.failure.title).view;
}
