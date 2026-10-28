/** A space's announcements (screen 18): the owner's and reception's «الإعلانات». */
export const ANNOUNCEMENTS = {
  /** The tabs, one per state, each with the summary's count. */
  tabs: {
    label: 'Announcement status',
    RUNNING: 'Active',
    UPCOMING: 'Scheduled',
    ENDED: 'Ended',
  },
  types: {
    GENERAL: 'General',
    OUTAGE: 'Power or internet outage',
    CLOSURE: 'Temporary closure',
    OFFER: 'Offer',
    EVENT: 'Event',
  },
  /** What each type does, under its name where it is chosen. */
  hints: {
    GENERAL: 'News or a note for visitors',
    OUTAGE: 'The space stays open; visitors are warned',
    CLOSURE: 'The space shows “Closed now” for the whole period',
    OFFER: 'A price or a service for a limited time',
    EVENT: 'A workshop or a meetup at the space',
  },
  /** An announcement's period, on Gaza's clock. */
  period: {
    sameDay: ({ day, from, to }: { day: string; from: string; to: string }) =>
      `${day} ${from}–${to}`,
    range: ({
      fromDay,
      from,
      toDay,
      to,
    }: {
      fromDay: string;
      from: string;
      toDay: string;
      to: string;
    }) => `${fromDay} ${from} – ${toDay} ${to}`,
    open: ({ day, from }: { day: string; from: string }) => `From ${day} ${from} · no end`,
  },
  /** A closure's line on its card, about extending the subscriptions it covered. */
  closure: {
    upcoming: 'Subscriptions can be extended once the closure has started.',
    reception: 'The owner extends subscriptions once the closure has started.',
  },
  empty: {
    RUNNING: 'No active announcements',
    UPCOMING: 'No scheduled announcements',
    ENDED: 'No ended announcements',
    text: 'Announce a closure, an outage, an offer or an event for visitors to see on the space page.',
  },
  list: {
    label: 'Announcements',
    loadFailed: 'We couldn’t load the announcements',
    pagination: {
      label: 'Pages of announcements',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
} as const;
