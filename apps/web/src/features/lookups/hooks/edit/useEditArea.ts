import type { AdminArea, UpdateAreaRequest } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/** Edits area `id`, its names and whether it is shown, pending until the list is fetched again. */
export function useEditArea(id: number) {
  const refetch = useRefetchGovernorates();

  return useMutation<AdminArea, AppError, UpdateAreaRequest>({
    mutationFn: (request) => repository.editArea(id, request),
    onSuccess: () => refetch(),
  });
}
