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
  /** A signed-in user's «بلاغاتي» (screen 11): their own reports and the replies. */
  mine: {
    title: 'My reports',
    description: 'Reports you sent about wrong information, newest first.',
    chips: { label: 'Filter reports', all: 'All', open: 'In review', decided: 'Reviewed' },
    /** The list's region. */
    region: 'Reports',
    /** A report's line: its field group and the day it was sent. */
    meta: ({ field, day }: { field: string; day: string }) => `${field} · Sent ${day}`,
    /** A space that left the directory, its name shown as text (C7). */
    gone: 'This space is no longer listed in the directory',
    /** The toggle of a long message. */
    more: 'Show more',
    less: 'Show less',
    /** No report sent yet, with no filter (DI-53). */
    empty: {
      title: 'You haven’t sent any reports yet',
      text: 'If you see wrong information on a space’s page, report it from there.',
    },
    /** None under a chip. */
    none: 'No reports here',
    loadFailed: 'We couldn’t load your reports',
  },
  /** A space's page: «الإبلاغ عن معلومة غير صحيحة» and its dialog. */
  report: {
    trigger: 'Report wrong information',
    title: 'Report wrong information',
    /** Who reads it, by the space's verification (DI-45, U10). */
    toSpace: ({ name }: { name: string }) =>
      `Your report on ${name} goes to the space’s management; you’ll find their reply in “My reports”.`,
    toTeam: ({ name }: { name: string }) =>
      `Our team reviews your report on ${name}; you’ll find the reply in “My reports”.`,
    field: 'What’s wrong?',
    choose: 'Choose',
    fieldRequired: 'Choose what’s wrong',
    message: 'Details',
    optional: 'Optional',
    helper: 'For example: the monthly price is now ₪320',
    messageRequired: 'Write what is wrong under “Other”.',
    send: 'Send',
    back: 'Back',
    failed: 'We couldn’t send the report',
    lost: 'No answer came back. Try again — the report won’t be sent twice.',
    gone: 'This space is no longer in the directory.',
    /** The toast: where the reply lands (DI-47), or that one is already open (DI-48). */
    sentSpace:
      'We sent your report to the space’s management. You’ll find their reply in “My reports”.',
    sentTeam: 'We sent your report to our team. You’ll find the reply in “My reports”.',
    repeated: 'You already reported this, and it is still in review.',
    showMine: 'View my reports',
  },
} as const;
