import type { AnnouncementState, AnnouncementType } from './requests.ts';

// The answers of the managed announcements endpoints (docs/api/api-contract.md §5, Announcements
// (managed)).

/** An announcement as its space's staff see it, with its state now; instants with their offset. */
export interface Announcement {
  id: number;
  type: AnnouncementType;
  textAr: string;
  textEn: string | null;
  startsAt: string;
  endsAt: string | null;
  state: AnnouncementState;
}

/** A closure's extension of the subscriptions it covered, once applied: by whom, when, how many. */
export interface ExtensionApplied {
  days: number;
  /** How many subscriptions it moved. */
  subscriptions: number;
  appliedAt: string;
  appliedBy: { id: number; name: string };
}

/** A closure's extension as applied: the closure, its days, how many it moved, by whom, when. */
export type ClosureExtension = ExtensionApplied & { announcementId: number };

/**
 * A started closure's extension, before it is applied: the Gaza days it covered (to today while it
 * runs), the days proposed (those days, at most `EXTENSION_MAX_DAYS`) and how many subscriptions it
 * covered. Once applied, `applied` answers it, and `subscriptions` is how many it moved.
 */
export interface ExtensionPreview {
  firstDay: string;
  lastDay: string;
  proposedDays: number;
  subscriptions: number;
  applied: ExtensionApplied | null;
}

/**
 * An announcement of the managed list: a closure carries `extension`, `null` until its
 * subscriptions are extended; the other types carry none.
 */
export type ManagedAnnouncement = Announcement & { extension?: ExtensionApplied | null };

/** The managed list's counts, by state, and the started closures with no extension yet. */
export interface AnnouncementsSummary {
  running: number;
  upcoming: number;
  ended: number;
  closuresAwaitingExtension: number;
}
