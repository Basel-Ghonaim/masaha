import type { AdminArea, CreateAreaRequest } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { useRefetchGovernorates } from '../useRefetchGovernorates';

const repository = createLookupsRepository();

/** Adds an area to its governorate, pending until the list, with it placed last, is fetched again. */
export function useAddArea() {
  const refetch = useRefetchGovernorates();

  return useMutation<AdminArea, AppError, CreateAreaRequest>({
    mutationFn: (request) => repository.addArea(request),
    onSuccess: () => refetch(),
  });
}
