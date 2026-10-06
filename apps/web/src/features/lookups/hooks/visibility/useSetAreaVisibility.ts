import type { AdminArea } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { RowAction } from '../../types/RowAction';
import { rowActionKey } from '../mutationKeys';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/** Hides an area (`isActive: false`) or restores it, pending until the list is fetched again. */
export function useSetAreaVisibility() {
  const refetch = useRefetchGovernorates();

  return useMutation<AdminArea, AppError, Required<RowAction> & { isActive: boolean }>({
    mutationKey: rowActionKey('areaVisibility'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ areaId, isActive }) => repository.editArea(areaId, { isActive }),
    onSuccess: () => refetch(),
  });
}
