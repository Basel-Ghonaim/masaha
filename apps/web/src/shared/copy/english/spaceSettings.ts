import { englishPlural } from '../plural';

/** The owner's settings page: a space's settings, a card each. */
export const SPACE_SETTINGS = {
  loadFailed: 'We couldn’t load the settings',
  /** Every card's frame. */
  card: {
    save: 'Save',
    discard: 'Discard changes',
    unsaved: 'Unsaved changes',
    unchanged: 'Nothing changed',
    saved: ({ card }: { card: string }) => `“${card}” saved`,
    failed: ({ card }: { card: string }) => `Couldn’t save “${card}”`,
  },
  pricing: {
    title: 'Visit pricing',
    description: 'How a visit’s price is worked out from the hour and day prices.',
    pricesLink: 'Packages & prices',
    rounding: 'Rounding',
    upAfter: 'Round up after',
    minutesLabel: 'Rounding minutes',
    minutesUnit: ({ count }: { count: number }) =>
      englishPlural(count, { one: 'minute', other: 'minutes' }),
    twoHours: '2 h',
    twoHoursAnd: ({ count }: { count: number }) => `2 h ${String(count)} min`,
    /** An example of "up after N minutes", the two stays either side of N. */
    example: ({ under, over }: { under: string; over: string }) => `${under} = 2 h · ${over} = 3 h`,
    half: 'To the nearest half hour',
    halfHint: '2 h 20 min = 2.5 h',
    minute: 'By the minute',
    minuteHint: '2 h 20 min is charged as it is',
    cap: 'Never more than the day price',
    students: 'Use student prices for visits when available',
    fieldErrors: {
      minutes: {
        required: 'Enter the minutes',
        out_of_range: 'From 1 to 59 minutes',
        invalid_format: 'From 1 to 59 minutes',
      },
    },
  },
  attendance: {
    title: 'Attendance and the live status',
    capacity: 'Capacity',
    capacityHelp:
      'Never shown to visitors. It decides when the space shows “Full”; without it there is no live status.',
    autoOut: 'Automatic check-out at closing',
    autoOutHelp: 'Whoever is still in is checked out at closing time.',
    maxStay: 'Automatic check-out after (hours)',
    maxStayHelp:
      'Whoever stays longer is checked out, before closing. Leave it empty to check out at closing only.',
    optional: 'Optional',
    fieldErrors: {
      capacity: {
        out_of_range: 'A whole number from 1 to 1,000',
        invalid_format: 'A whole number from 1 to 1,000',
      },
      maxStay: { out_of_range: 'From 1 to 23 hours', invalid_format: 'A whole number of hours' },
    },
    /** The capacity saved, then the check-out settings refused: what was saved and what was not. */
    partial: 'The capacity was saved; the automatic check-out settings were not',
    /** A 403 on the settings once the capacity is saved: something was. */
    forbiddenAfterCapacity: 'This is no longer open to you at this space.',
  },
  reception: {
    title: 'Reception',
    switch: 'Reception may type a price by hand',
    help: 'For a custom subscription, or a visit with no price, with a reason recorded. You can always type one yourself.',
  },
  /** A save's refusals, in the owner's words: the space's route, whose 404 is the space's. */
  refusals: {
    forbidden: 'This is no longer open to you at this space; nothing was saved.',
    not_found: 'This space is no longer available to you.',
  },
} as const;
