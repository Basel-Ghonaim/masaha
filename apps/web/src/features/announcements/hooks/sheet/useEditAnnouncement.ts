import type { Announcement, EditAnnouncementRequest } from '@masaha/shared/announcements';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';

const repository = createAnnouncementsRepository();

/**
 * Edits an announcement: idempotent by design, so sent once with no key and never again by itself
 * (S4); the whole space is read again once done (S12).
 */
export function useEditAnnouncement(spaceId: number) {
  const { settle, linkEnded } = useAnnouncementsWrite();
  return useMutation<Announcement, AppError, { id: number; body: EditAnnouncementRequest }>({
    mutationFn: ({ id, body }) => repository.edit(spaceId, id, body),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
