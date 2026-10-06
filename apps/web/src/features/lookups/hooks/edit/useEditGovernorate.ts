import type { AdminGovernorate, UpdateGovernorateRequest } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/** Edits governorate `id`, its names and whether it is shown, pending until the list is fetched again. */
export function useEditGovernorate(id: number) {
  const refetch = useRefetchGovernorates();

  return useMutation<AdminGovernorate, AppError, UpdateGovernorateRequest>({
    mutationFn: (request) => repository.editGovernorate(id, request),
    onSuccess: () => refetch(),
  });
}
