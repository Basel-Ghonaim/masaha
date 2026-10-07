import type { AdminAmenity } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { AmenityAction } from '../../types/AmenityAction';
import { amenityActionKey } from '../mutationKeys';
import { useRefetchAmenities } from '../useRefetchAmenities';

const repository = createLookupsRepository();

/**
 * Offers an amenity in the directory's filter (`isFilterable: true`) or leaves it out, pending until
 * the list is fetched again.
 */
export function useSetAmenityFilter() {
  const refetch = useRefetchAmenities();

  return useMutation<AdminAmenity, AppError, AmenityAction & { isFilterable: boolean }>({
    mutationKey: amenityActionKey('amenityFilter'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ amenityId, isFilterable }) =>
      repository.editAmenity(amenityId, { isFilterable }),
    onSuccess: () => refetch(),
  });
}
