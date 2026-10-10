import type { LookupsCatalogue } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { lookupsKeys } from '../queryKeys';

const repository = createLookupsRepository();

/** The public catalogue: the active governorates with their active areas, and the active amenities. */
export function useCatalogueQuery() {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<LookupsCatalogue, AppError>({
    queryKey: lookupsKeys.catalogue,
    queryFn: () => repository.catalogue(),
  });
}
