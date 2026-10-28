import type { AnnouncementsSummary, ManagedAnnouncement } from '@masaha/shared/announcements';
import type { FakeAnswer } from './fakeAdapter';

/**
 * An announcement as the managed list answers it: a running general one, 08:00–18:00 in Gaza on 21
 * October 2026, with its English text.
 */
export function announcement(change: Partial<ManagedAnnouncement> = {}): ManagedAnnouncement {
  return {
    id: 5,
    type: 'GENERAL',
    textAr: 'ورشة تصميم مساء الخميس',
    textEn: 'A design workshop on Thursday evening',
    startsAt: '2026-10-21T05:00:00.000Z',
    endsAt: '2026-10-21T15:00:00.000Z',
    state: 'RUNNING',
    ...change,
  };
}

/** A running closure, not extended: 08:00 on 20 October to 18:00 on 22 October 2026 in Gaza. */
export function closure(change: Partial<ManagedAnnouncement> = {}): ManagedAnnouncement {
  return announcement({
    id: 9,
    type: 'CLOSURE',
    textAr: 'المساحة مغلقة للصيانة',
    textEn: 'The space is closed for maintenance',
    startsAt: '2026-10-20T05:00:00.000Z',
    endsAt: '2026-10-22T15:00:00.000Z',
    extension: null,
    ...change,
  });
}

/** The tabs' counts. */
export function announcementsSummary(
  change: Partial<AnnouncementsSummary> = {},
): AnnouncementsSummary {
  return { running: 2, upcoming: 1, ended: 7, closuresAwaitingExtension: 0, ...change };
}

/** A page of the managed list, with its pagination. */
export function announcementsPage(
  rows: ManagedAnnouncement[],
  { total = rows.length, currentPage = 1 }: { total?: number; currentPage?: number } = {},
): FakeAnswer {
  const totalPages = Math.ceil(total / 20);
  return {
    status: 200,
    data: {
      success: true,
      data: rows,
      meta: {
        currentPage,
        limit: 20,
        totalRecords: total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    },
  };
}
