import type {
  Announcement,
  ClosureExtension,
  ExtensionApplied,
  ManagedAnnouncement,
} from '@masaha/shared/announcements';

import type { ExtensionRow } from './closures.repository.ts';

/** An extension's row, with its applier's name, as the contract's `ExtensionApplied` shows it. */
export function toExtensionApplied(row: ExtensionRow, name: string): ExtensionApplied {
  return {
    days: row.days,
    subscriptions: row.subscriptions,
    appliedAt: row.appliedAt.toISOString(),
    appliedBy: { id: row.appliedById, name },
  };
}

/** An extension's row, with its applier's name, as the extension's answer shows it. */
export function toClosureExtension(row: ExtensionRow, name: string): ClosureExtension {
  return { announcementId: row.announcementId, ...toExtensionApplied(row, name) };
}

/** An announcement of the managed list: a closure carries its extension, `null` before one. */
export function toManagedAnnouncement(
  announcement: Announcement,
  extension: ExtensionApplied | undefined,
): ManagedAnnouncement {
  return announcement.type === 'CLOSURE'
    ? { ...announcement, extension: extension ?? null }
    : announcement;
}
