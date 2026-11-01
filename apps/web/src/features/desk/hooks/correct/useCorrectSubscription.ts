import type {
  CorrectPriceRequest,
  CorrectSubscriptionRequest,
  SubscriptionState,
} from '@masaha/shared/subscriptions';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/**
 * Corrects a subscription's name, dates and limits. No key: the same correction again changes
 * nothing, so it is sent once and never again by itself (S3); the space is read again, the file and
 * its card with it.
 */
export function useCorrectTerms(spaceId: number, subscriptionId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<SubscriptionState, AppError, CorrectSubscriptionRequest>({
    mutationFn: (body) => repository.correctSubscription(spaceId, subscriptionId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}

/** The owner's correction of a subscription's billing and price, with why; as the terms', no key. */
export function useCorrectPrice(spaceId: number, subscriptionId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<SubscriptionState, AppError, CorrectPriceRequest>({
    mutationFn: (body) => repository.correctPrice(spaceId, subscriptionId, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
