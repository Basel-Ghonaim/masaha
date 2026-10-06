import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { RowAction } from '../../types/RowAction';
import { rowActionKey } from '../mutationKeys';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/**
 * Sets the order of a governorate's areas (`ids`) after one of them (`areaId`) moved. It is pending
 * until the list is fetched again; a conflict fetches it again too.
 */
export function useOrderAreas() {
  const refetch = useRefetchGovernorates();

  return useMutation<undefined, AppError, Required<RowAction> & { ids: number[] }>({
    mutationKey: rowActionKey('areaOrder'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ governorateId, ids }) => repository.orderAreas(governorateId, ids),
    onSuccess: () => refetch(),
    onError: (error) => (error.type === 'conflict' ? refetch() : undefined),
  });
}
