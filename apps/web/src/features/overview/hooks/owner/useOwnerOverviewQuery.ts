import type { OwnerOverview } from '@masaha/shared/overview';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createOverviewRepository } from '../../repository/overviewRepository';
import { overviewKeys } from '../queryKeys';

const repository = createOverviewRepository();

/**
 * The owner's overview of the space. Never polled (OV7): read again each time the page opens, and
 * on returning to the window once stale.
 */
export function useOwnerOverviewQuery(spaceId: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<OwnerOverview, AppError>({
    queryKey: overviewKeys.owner(spaceId),
    queryFn: () => repository.owner(spaceId),
    refetchOnMount: 'always',
  });
}
