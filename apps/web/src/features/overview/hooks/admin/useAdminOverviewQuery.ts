import type { AdminOverview } from '@masaha/shared/overview';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createOverviewRepository } from '../../repository/overviewRepository';
import { overviewKeys } from '../queryKeys';

const repository = createOverviewRepository();

/**
 * The admin's overview of the platform. Never polled (OV7): read again each time the page opens,
 * and on returning to the window once stale.
 */
export function useAdminOverviewQuery() {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<AdminOverview, AppError>({
    queryKey: overviewKeys.admin(),
    queryFn: () => repository.admin(),
    refetchOnMount: 'always',
  });
}
