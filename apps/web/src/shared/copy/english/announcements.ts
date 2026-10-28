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
    extendedLock:
      'Its subscriptions were extended, so it isn’t deleted and its end isn’t moved later.',
  },
  empty: {
    RUNNING: 'No active announcements',
    UPCOMING: 'No scheduled announcements',
    ENDED: 'No ended announcements',
    text: 'Announce a closure, an outage, an offer or an event for visitors to see on the space page.',
  },
  /** The list's actions on a card and at the end of the tabs. */
  actions: {
    new: 'New announcement',
    edit: 'Edit',
    end: 'End now',
    start: 'Start now',
    more: ({ type, period }: { type: string; period: string }) =>
      `More actions: ${type} · ${period}`,
    delete: 'Delete…',
    ended: 'The announcement has ended',
    closureEnded: 'The closure has ended · the status is automatic again',
    started: 'The announcement has started',
    undo: 'Undo',
    undone: 'The announcement is back as it was',
    undoFailed: 'We couldn’t undo it',
    failed: 'We couldn’t do that',
    startTooLong: 'Its end is more than 365 days from now; edit it first.',
  },
  /** The delete's dialog: it names the announcement and says what deleting it does now. */
  delete: {
    title: ({ type, period }: { type: string; period: string }) =>
      `Delete the announcement “${type} · ${period}”?`,
    runningClosure:
      'It leaves the space’s page, and the status is automatic again at once. It can’t be brought back.',
    running: 'It leaves the space’s page at once. It can’t be brought back.',
    upcoming: 'Visitors won’t see it. It can’t be brought back.',
    ended: 'It leaves this list. It can’t be brought back.',
    confirm: 'Delete',
    back: 'Back',
    done: 'Announcement deleted',
    failed: 'We couldn’t delete the announcement',
  },
  /** The sheet that posts an announcement or edits one. */
  sheet: {
    new: 'New announcement',
    edit: 'Edit announcement',
    description: 'Shown on the space’s public page during the period.',
    close: 'Close',
    type: 'Type',
    textAr: 'Text in Arabic',
    textArHelper: 'A sentence or two visitors read on the space page.',
    textEn: 'Text in English',
    textEnHelper: 'Shown in the English interface; without it, the Arabic text shows.',
    optional: 'Optional',
    starts: 'Starts',
    ends: 'Ends',
    now: 'Now',
    at: 'At a time',
    noEnd: 'No end',
    noEndHelp: 'It stays until you end it.',
    date: 'Date',
    time: 'Time',
    chooseDate: 'Choose a date',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    closure:
      'Visitors see the space as “Closed now” for this whole period, and the desk is warned at check-in.',
    preview: 'Preview — the space’s public page',
    publish: 'Publish',
    save: 'Save',
    failed: 'We couldn’t save the announcement',
    nothingChanged: 'Nothing changed',
    lost: 'No answer came back. Try again — it won’t be published twice.',
    fields: {
      textArRequired: 'Enter the Arabic text',
      startRange: 'The start is between 30 days ago and 365 days ahead.',
      endRange: 'The end comes after now and after the start, within 365 days of it.',
    },
    gone: 'This announcement no longer exists.',
  },
  /** What a write's toast says, and where the announcement went. */
  toast: {
    published: 'Announcement published',
    saved: 'Announcement saved',
    inTab: ({ tab }: { tab: string }) => `In “${tab}”`,
    show: 'Show',
  },
  /** The space's public page, as the sheet's preview draws it. */
  public: {
    title: 'Announcements',
    notice: ({ period }: { period: string }) => `An announcement from the space · ${period}`,
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
