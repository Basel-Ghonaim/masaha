import type { SubscriptionState } from '@masaha/shared/subscriptions';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * Ends a subscription early. No key: one ended already is answered as it is, so it is sent once and
 * never again by itself (S3); the space is read again, the file and its card with it.
 */
export function useEndSubscription(spaceId: number, subscriptionId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<SubscriptionState, AppError>({
    mutationFn: () => repository.endSubscription(spaceId, subscriptionId),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
