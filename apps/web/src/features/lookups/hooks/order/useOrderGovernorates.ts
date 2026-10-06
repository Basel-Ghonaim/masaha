import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { RowAction } from '../../types/RowAction';
import { rowActionKey } from '../mutationKeys';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/**
 * Sets the governorates' order (`ids`) after one of them (`governorateId`) moved. It is pending until
 * the list is fetched again; a conflict, an order set on a list that changed meanwhile, fetches it
 * again too, so the next move starts from the server's order.
 */
export function useOrderGovernorates() {
  const refetch = useRefetchGovernorates();

  return useMutation<undefined, AppError, RowAction & { ids: number[] }>({
    mutationKey: rowActionKey('governorateOrder'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ ids }) => repository.orderGovernorates(ids),
    onSuccess: () => refetch(),
    onError: (error) => (error.type === 'conflict' ? refetch() : undefined),
  });
}
