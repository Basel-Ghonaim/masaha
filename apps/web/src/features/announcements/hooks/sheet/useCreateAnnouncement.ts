import type { Announcement, CreateAnnouncementRequest } from '@masaha/shared/announcements';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';

const repository = createAnnouncementsRepository();

/** Posts an announcement with its intent's key (S4); the whole space is read again once done (S12). */
export function useCreateAnnouncement(spaceId: number) {
  const { settle, linkEnded } = useAnnouncementsWrite();
  return useMutation<Announcement, AppError, { body: CreateAnnouncementRequest; key: string }>({
    mutationFn: ({ body, key }) => repository.create(spaceId, body, key),
    onSuccess: () => {
      settle(spaceId);
    },
    onError: linkEnded,
  });
}
