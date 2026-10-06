import type { AdminGovernorate, CreateGovernorateRequest } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/** Adds a governorate, pending until the list, with it placed last, is fetched again. */
export function useAddGovernorate() {
  const refetch = useRefetchGovernorates();

  return useMutation<AdminGovernorate, AppError, CreateGovernorateRequest>({
    mutationFn: (request) => repository.addGovernorate(request),
    onSuccess: () => refetch(),
  });
}
