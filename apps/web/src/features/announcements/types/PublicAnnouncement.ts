import type { Announcement } from '@masaha/shared/announcements';

/**
 * An announcement as a space's public page carries it: running or upcoming, with no state of its own
 * (the directory's `PublicAnnouncement` has these fields).
 */
export type PublicAnnouncement = Pick<
  Announcement,
  'id' | 'type' | 'textAr' | 'textEn' | 'startsAt' | 'endsAt'
>;
