import type {
  AnnouncementsQuery,
  AnnouncementsSummary,
  ManagedAnnouncement,
} from '@masaha/shared/announcements';
import { api, type Page } from '@shared/api';

/**
 * A space's announcements on the server (docs/api/api-contract.md §5, Announcements (managed)): the
 * managed list and its summary, which `subscriptions` composes on the same path (S2).
 */
export interface AnnouncementsRepository {
  /** A page of one state's announcements, a closure with its extension. */
  list(spaceId: number, query: AnnouncementsQuery): Promise<Page<ManagedAnnouncement[]>>;
  /** How many are running, upcoming and ended: the tabs' counts. */
  summary(spaceId: number): Promise<AnnouncementsSummary>;
}

const pathOf = (spaceId: number) => `/manage/spaces/${String(spaceId)}/announcements`;

export function createAnnouncementsRepository(): AnnouncementsRepository {
  return {
    list: (spaceId, query) =>
      api.getPage<ManagedAnnouncement[]>(pathOf(spaceId), { params: query }),
    summary: (spaceId) => api.get<AnnouncementsSummary>(`${pathOf(spaceId)}/summary`),
  };
}
