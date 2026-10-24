import type { Announcement } from '@masaha/shared/announcements';

import { announcementState } from './announcementState.ts';
import type { AnnouncementRow } from './announcements.repository.ts';

/** An announcement's row, as the contract's `Announcement` shows it at `now`. */
export function toAnnouncement(row: AnnouncementRow, now: Date): Announcement {
  return {
    id: row.id,
    type: row.type,
    textAr: row.textAr,
    textEn: row.textEn,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    state: announcementState(row, now),
  };
}
