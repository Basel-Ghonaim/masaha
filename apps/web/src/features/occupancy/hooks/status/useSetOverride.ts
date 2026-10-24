import type { SetStatusOverrideRequest, SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOccupancyRepository } from '../../repository/occupancyRepository';
import { occupancyKeys } from '../queryKeys';

const repository = createOccupancyRepository();

/**
 * Sets the live status by hand for a while: the answer, the state now, replaces the desk's. Sent once,
 * with no key: a lost answer is the user's to retry (docs/frontend/architecture.md §7).
 */
export function useSetOverride(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<SpaceOccupancyNow, AppError, SetStatusOverrideRequest>({
    mutationKey: occupancyKeys.override(spaceId),
    mutationFn: (request) => repository.setOverride(spaceId, request),
    onSuccess: (answer) => {
      client.setQueryData(occupancyKeys.now(spaceId), answer);
    },
    onError: linkEnded,
  });
}
