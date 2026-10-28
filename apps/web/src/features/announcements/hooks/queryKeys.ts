import type { AnnouncementState } from '@masaha/shared/announcements';

/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const announcementsKeys = {
  /** Every read of the space's announcements: a write reads the whole space again (S12). */
  all: (spaceId: number) => ['space', spaceId, 'announcements'] as const,
  /** One page of one state's announcements. */
  list: (spaceId: number, state: AnnouncementState, page: number) =>
    ['space', spaceId, 'announcements', 'list', state, page] as const,
  /** The tabs' counts. */
  summary: (spaceId: number) => ['space', spaceId, 'announcements', 'summary'] as const,
};
