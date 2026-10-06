import type { AdminGovernorate } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import type { RowAction } from '../../types/RowAction';
import { rowActionKey } from '../mutationKeys';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/** Hides a governorate (`isActive: false`) or restores it, pending until the list is fetched again. */
export function useSetGovernorateVisibility() {
  const refetch = useRefetchGovernorates();

  return useMutation<AdminGovernorate, AppError, RowAction & { isActive: boolean }>({
    mutationKey: rowActionKey('governorateVisibility'),
    // Its failure shows only while its row is on screen: once the page is left, it is gone.
    gcTime: 0,
    mutationFn: ({ governorateId, isActive }) =>
      repository.editGovernorate(governorateId, { isActive }),
    onSuccess: () => refetch(),
  });
}
