import type { Announcement } from '@masaha/shared/announcements';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';

const repository = createAnnouncementsRepository();

/**
 * Ends an announcement now: idempotent by design, so sent once with no key and never again by
 * itself (S4); the whole space is read again once done (S12).
 */
export function useEndNow(spaceId: number) {
  const { settle, linkEnded } = useAnnouncementsWrite();
  return useMutation<Announcement, AppError, number>({
    mutationFn: (id) => repository.end(spaceId, id),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
