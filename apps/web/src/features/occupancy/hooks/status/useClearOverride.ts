import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOccupancyRepository } from '../../repository/occupancyRepository';
import { occupancyKeys } from '../queryKeys';

const repository = createOccupancyRepository();

/** Clears the override in force, the status automatic again: the answer replaces the desk's state now. */
export function useClearOverride(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<SpaceOccupancyNow, AppError>({
    mutationKey: occupancyKeys.override(spaceId),
    mutationFn: () => repository.clearOverride(spaceId),
    onSuccess: (answer) => {
      client.setQueryData(occupancyKeys.now(spaceId), answer);
    },
    onError: linkEnded,
  });
}
