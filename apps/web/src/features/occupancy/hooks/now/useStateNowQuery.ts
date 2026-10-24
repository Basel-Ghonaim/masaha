import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createOccupancyRepository } from '../../repository/occupancyRepository';
import { occupancyKeys } from '../queryKeys';

const repository = createOccupancyRepository();

/** How often the desk reads who is present while it is visible (docs/frontend/architecture.md §7). */
const POLL_MS = 30_000;

/**
 * The space's state now, as its staff see it: read on arrival, every 30 s while the page is visible
 * and never while it is hidden, and at once on returning to it, however fresh; a 404 fetches the
 * user's own spaces again.
 */
export function useStateNowQuery(spaceId: number) {
  const linkEnded = useLinkEnded();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<SpaceOccupancyNow, AppError>({
    queryKey: occupancyKeys.now(spaceId),
    queryFn: () => repository.stateNow(spaceId),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
  // A 404 is a link ended meanwhile: the user's own spaces are fetched again.
  useEffect(() => {
    linkEnded(query.error);
  }, [query.error, linkEnded]);
  return query;
}
