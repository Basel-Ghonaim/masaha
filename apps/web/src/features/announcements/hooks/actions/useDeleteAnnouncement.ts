import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';

const repository = createAnnouncementsRepository();

/**
 * Deletes an announcement: idempotent by design, so sent once with no key and never again by itself
 * (S4); the whole space is read again once done (S12).
 */
export function useDeleteAnnouncement(spaceId: number) {
  const { settle, linkEnded } = useAnnouncementsWrite();
  return useMutation<undefined, AppError, number>({
    mutationFn: (id) => repository.remove(spaceId, id),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
