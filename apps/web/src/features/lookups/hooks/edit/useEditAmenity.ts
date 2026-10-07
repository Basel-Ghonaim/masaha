import type { AdminAmenity, UpdateAmenityRequest } from '@masaha/shared/lookups';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createLookupsRepository } from '../../repository/lookupsRepository';
import { useRefetchAmenities } from '../useRefetchAmenities';

const repository = createLookupsRepository();

/** Edits amenity `id`: its names, icon and flags, pending until the list is fetched again. */
export function useEditAmenity(id: number) {
  const refetch = useRefetchAmenities();

  return useMutation<AdminAmenity, AppError, UpdateAmenityRequest>({
    mutationFn: (request) => repository.editAmenity(id, request),
    onSuccess: () => refetch(),
  });
}
