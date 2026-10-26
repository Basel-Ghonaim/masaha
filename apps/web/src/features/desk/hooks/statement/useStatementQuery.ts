import type { SubscriptionStatement } from '@masaha/shared/desk';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * A subscription's statement, read while it is open and again after any desk write (S2); nothing
 * while it is closed.
 */
export function useStatementQuery(spaceId: number, subscriptionId: number, open: boolean) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<SubscriptionStatement, AppError>({
    queryKey: deskKeys.statement(spaceId, subscriptionId),
    queryFn: () => repository.statement(spaceId, subscriptionId),
    enabled: open,
  });
}
