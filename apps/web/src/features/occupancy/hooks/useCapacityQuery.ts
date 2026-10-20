import type { SpaceCapacity } from '@masaha/shared/occupancy';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createOccupancyRepository } from '../repository/occupancyRepository';
import { occupancyKeys } from './queryKeys';

const repository = createOccupancyRepository();

/**
 * The space's capacity, private to its staff: `null` before one is set; a 404 fetches the owner's own
 * spaces again.
 */
export function useCapacityQuery(spaceId: number) {
  const linkEnded = useLinkEnded();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<SpaceCapacity, AppError>({
    queryKey: occupancyKeys.capacity(spaceId),
    queryFn: () => repository.getCapacity(spaceId),
  });
  // A 404 is a link ended meanwhile: the user's own spaces are fetched again.
  useEffect(() => {
    linkEnded(query.error);
  }, [query.error, linkEnded]);
  return query;
}
