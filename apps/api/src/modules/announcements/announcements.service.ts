import type { Tx } from '../../db/index.ts';
import { createAnnouncementsRepository } from './announcements.repository.ts';

/**
 * A space's announcements (docs/backend/conventions.md §7). So far the closures the live status
 * reads.
 */
export function createAnnouncementsService() {
  const repository = createAnnouncementsRepository();
  return {
    /** Which of these spaces an active closure covers at `now`, in one query. */
    closedAt(spaceIds: readonly number[], now: Date, tx?: Tx): Promise<Set<number>> {
      return repository.closedAt(spaceIds, now, tx);
    },
  };
}

export type AnnouncementsService = ReturnType<typeof createAnnouncementsService>;
