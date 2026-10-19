import type { Tx } from '../../db/index.ts';
import { createSubscriptionsRepository, type OpenCheckIn } from './subscriptions.repository.ts';

/**
 * A customer's subscriptions and their check-ins (docs/backend/conventions.md › the front desk). So
 * far the read `occupancy` composes *present* from.
 */
export function createSubscriptionsService() {
  const repository = createSubscriptionsRepository();
  return {
    /** The space's open subscription check-ins, the earliest first, then by id. */
    openCheckInsIn(spaceId: number, tx?: Tx): Promise<OpenCheckIn[]> {
      return repository.openCheckInsIn(spaceId, tx);
    },
  };
}

export type SubscriptionsService = ReturnType<typeof createSubscriptionsService>;
