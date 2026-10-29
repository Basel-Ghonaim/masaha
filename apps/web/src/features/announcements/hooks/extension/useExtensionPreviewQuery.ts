import type { ExtensionPreview } from '@masaha/shared/announcements';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { announcementsKeys } from '../queryKeys';

const repository = createAnnouncementsRepository();

/**
 * A closure's extension before it is applied, read again at each opening of the dialog (S3): the
 * covered count moves with the subscriptions, and the preview is no lock.
 */
export function useExtensionPreviewQuery(spaceId: number, announcementId: number) {
  return useQuery<ExtensionPreview, AppError>({
    queryKey: announcementsKeys.preview(spaceId, announcementId),
    queryFn: () => repository.preview(spaceId, announcementId),
    refetchOnMount: 'always',
  });
}
