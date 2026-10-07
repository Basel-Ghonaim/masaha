import type { AdminAmenity } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { lookupsKeys } from '../queryKeys';

const repository = createLookupsRepository();

/** The admin's amenities, retired ones included, in order. */
export function useAmenitiesQuery() {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<AdminAmenity[], AppError>({
    queryKey: lookupsKeys.amenities,
    queryFn: () => repository.amenities(),
  });
}
