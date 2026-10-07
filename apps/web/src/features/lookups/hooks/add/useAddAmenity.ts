import type { AdminAmenity, CreateAmenityRequest } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { useRefetchAmenities } from '../useRefetchAmenities';

const repository = createLookupsRepository();

/** Adds an amenity, pending until the list, with it placed last, is fetched again. */
export function useAddAmenity() {
  const refetch = useRefetchAmenities();

  return useMutation<AdminAmenity, AppError, CreateAmenityRequest>({
    mutationFn: (request) => repository.addAmenity(request),
    onSuccess: () => refetch(),
  });
}
