import type { CheckInSubscriberRequest } from '@masaha/shared/subscriptions';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createDeskRepository, type SubscriberCheckedIn } from '../../repository/deskRepository';
import { useDeskWrite } from '../useDeskWrite';

const repository = createDeskRepository();

/** Checks a subscriber in, with the intent's key; the space is read again once it is done. */
export function useCheckInSubscriber(spaceId: number) {
  const { settle, linkEnded } = useDeskWrite();
  return useMutation<
    SubscriberCheckedIn,
    AppError,
    { body: CheckInSubscriberRequest; key: string }
  >({
    mutationFn: ({ body, key }) => repository.checkInSubscriber(spaceId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
