import type { ClosureExtension, ExtendSubscriptionsRequest } from '@masaha/shared/announcements';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';

const repository = createAnnouncementsRepository();

/**
 * Extends the subscriptions a closure covered, with the opening's key (S4); the whole space is read
 * again once done (S12): the subscriptions' ends moved.
 */
export function useExtendSubscriptions(spaceId: number, announcementId: number) {
  const { settle, linkEnded } = useAnnouncementsWrite();
  return useMutation<ClosureExtension, AppError, { body: ExtendSubscriptionsRequest; key: string }>(
    {
      mutationFn: ({ body, key }) => repository.extend(spaceId, announcementId, body, key),
      onSuccess: () => {
        settle(spaceId);
      },
      onError: linkEnded,
    },
  );
}
