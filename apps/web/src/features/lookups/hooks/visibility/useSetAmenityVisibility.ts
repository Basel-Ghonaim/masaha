import type { AdminAmenity } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { AmenityAction } from '../../types/AmenityAction';
import { amenityActionKey } from '../mutationKeys';
import { useRefetchAmenities } from '../useRefetchAmenities';

const repository = createLookupsRepository();

/** Retires an amenity (`isActive: false`) or restores it, pending until the list is fetched again. */
export function useSetAmenityVisibility() {
  const refetch = useRefetchAmenities();

  return useMutation<AdminAmenity, AppError, AmenityAction & { isActive: boolean }>({
    mutationKey: amenityActionKey('amenityVisibility'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ amenityId, isActive }) => repository.editAmenity(amenityId, { isActive }),
    onSuccess: () => refetch(),
  });
}
