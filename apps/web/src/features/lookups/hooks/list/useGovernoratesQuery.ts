import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { lookupsKeys } from '../queryKeys';

const repository = createLookupsRepository();

/** The admin's governorates, each with its areas, hidden ones included, in order. */
export function useGovernoratesQuery() {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<AdminGovernorateWithAreas[], AppError>({
    queryKey: lookupsKeys.governorates,
    queryFn: () => repository.governorates(),
  });
}
