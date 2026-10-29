import type { AnnouncementType, ManagedAnnouncement } from '@masaha/shared/announcements';

/** What opened the announcement sheet: a new announcement (of a type, when one is given), or an edit. */
export type SheetEntry =
  { mode: 'new'; type?: AnnouncementType } | { mode: 'edit'; announcement: ManagedAnnouncement };
