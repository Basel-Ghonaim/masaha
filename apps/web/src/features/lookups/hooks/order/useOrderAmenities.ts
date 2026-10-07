import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { AmenityAction } from '../../types/AmenityAction';
import { amenityActionKey } from '../mutationKeys';
import { useRefetchAmenities } from '../useRefetchAmenities';

const repository = createLookupsRepository();

/**
 * Sets the amenities' order (`ids`) after one of them (`amenityId`) moved. It is pending until the
 * list is fetched again; a conflict, an order set on a list that changed meanwhile, fetches it again
 * too, so the next move starts from the server's order.
 */
export function useOrderAmenities() {
  const refetch = useRefetchAmenities();

  return useMutation<undefined, AppError, AmenityAction & { ids: number[] }>({
    mutationKey: amenityActionKey('amenityOrder'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ ids }) => repository.orderAmenities(ids),
    onSuccess: () => refetch(),
    onError: (error) => (error.type === 'conflict' ? refetch() : undefined),
  });
}
