import type { SetCapacityRequest, SpaceCapacity } from '@masaha/shared/occupancy';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOccupancyRepository } from '../repository/occupancyRepository';
import { occupancyKeys } from './queryKeys';

const repository = createOccupancyRepository();

/** Sets the space's capacity, or clears it: the answer is kept as the capacity's query. */
export function useSetCapacity(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<SpaceCapacity, AppError, SetCapacityRequest>({
    mutationFn: (request) => repository.setCapacity(spaceId, request),
    onSuccess: (answer) => {
      client.setQueryData(occupancyKeys.capacity(spaceId), answer);
    },
    onError: linkEnded,
  });
}
