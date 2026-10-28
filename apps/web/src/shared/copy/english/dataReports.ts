import { englishPlural } from '../plural';

/** A space's data reports (screens 23, 28): the owner's list and the decision sheet. */
export const DATA_REPORTS = {
  /** The field groups a report names. */
  fields: {
    PRICES: 'Prices',
    HOURS: 'Opening hours',
    CONTACT: 'Contact',
    LOCATION: 'Location',
    AMENITIES: 'Amenities',
    OTHER: 'Other',
  },
  /** A report's status: as the space's staff and the admin read it, and as its reporter does. */
  statuses: {
    staff: { OPEN: 'New', RESOLVED: 'Corrected', DISMISSED: 'Not accepted' },
    reporter: { OPEN: 'In review', RESOLVED: 'Corrected', DISMISSED: 'Not accepted' },
  },
  chips: { label: 'Filter by status', all: 'All', open: 'New', decided: 'Reviewed' },
  /** The owner's «بلاغات البيانات». */
  space: {
    label: 'Data reports',
    intro: 'Visitors’ reports about wrong information on the space page.',
    columns: {
      field: 'Field',
      report: 'Report',
      date: 'Date',
      status: 'Status',
      actions: 'Actions',
    },
  },
  count: ({ count }: { count: number }) =>
    englishPlural(count, { one: '1 report', other: `${String(count)} reports` }),
  open: 'Open',
  view: 'View',
  visitor: 'A visitor',
  noMessage: 'The reporter wrote no details.',
  /** Who reported, and the day: «زائر · 21 أكتوبر». */
  byline: ({ who, day }: { who: string; day: string }) => `${who} · ${day}`,
  empty: {
    title: 'No reports',
    text: 'When a visitor reports wrong information, it shows up here.',
  },
  noMatch: 'No reports match the filters',
  showAll: 'Show all',
  loadFailed: 'We couldn’t load the reports',
  pagination: {
    label: 'Pages of reports',
    previous: 'Previous',
    next: 'Next',
    page: ({ page }: { page: number }) => `Page ${String(page)}`,
    summary: ({ page, total }: { page: number; total: number }) =>
      `Page ${String(page)} of ${String(total)}`,
    more: 'More pages',
  },
  /** The decision sheet. */
  sheet: {
    title: ({ field }: { field: string }) => `Report about ${field}`,
    report: 'The report',
    editField: 'Edit the field',
    replySpace: 'Reply from the space',
    replyTeam: 'Reply from our team',
    replyHelper:
      'Shown to the person who reported it. Required for “Not accepted”, optional for “Corrected”.',
    replyRequired: 'Write the reason; it’s what the reporter will read.',
    resolve: 'Corrected',
    dismiss: 'Not accepted',
    failed: 'We couldn’t save the decision',
    lost: 'No answer came back. Try again — the same decision isn’t recorded twice.',
    decided: 'Decision',
    reply: ({ text }: { text: string }) => `Reply: ${text}`,
    noReply: 'No reply',
    gone: 'This report no longer exists.',
    close: 'Close',
  },
  toast: {
    resolved: 'Marked “Corrected”',
    dismissed: 'Marked “Not accepted”',
    replied: 'The reply is shown to the reporter.',
    inDecided: 'In “Reviewed”',
    show: 'Show',
  },
  /** The admin's «بلاغات البيانات»: every space's reports. */
  admin: {
    label: 'Data reports',
    intro:
      'The admin decides unverified spaces’ reports. Verified spaces’ reports are decided by their owner and shown here for reference.',
    columns: {
      space: 'Space',
      field: 'Field',
      report: 'Report',
      reporter: 'Reporter',
      date: 'Date',
      status: 'Status',
      handledBy: 'Handled by',
      actions: 'Actions',
    },
    handledBy: { admin: 'Admin', owner: 'Owner' },
    space: 'Space',
    chosen: 'A chosen space',
    field: 'Field',
    allFields: 'All fields',
    tags: {
      space: ({ name }: { name: string }) => `Space: ${name}`,
      field: ({ field }: { field: string }) => `Field: ${field}`,
      removeSpace: 'Remove the space filter',
      removeField: 'Remove the field filter',
      clear: 'Clear filters',
    },
    filters: {
      title: 'Filters',
      show: ({ count }: { count: number }) =>
        englishPlural(count, { one: 'Show 1 report', other: `Show ${String(count)} reports` }),
      none: 'No results — change the filters',
    },
    readOnly: 'Verified space — its owner decides this report. For reference only.',
    openSpace: 'View the space',
    forbiddenVerified: 'This space is verified: its owner decides this report.',
  },
} as const;
