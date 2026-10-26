import type { SubscribeRequest } from '@masaha/shared/desk';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository, type Subscribed } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Subscribes a customer, with the intent's key; the space is read again once done. */
export function useSubscribe(spaceId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<
    Subscribed,
    AppError,
    { customerId: number; body: SubscribeRequest; key: string }
  >({
    mutationFn: ({ customerId, body, key }) => repository.subscribe(spaceId, customerId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
