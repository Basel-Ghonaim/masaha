import type { SUBSCRIPTION_BILLINGS } from '@masaha/shared/packages';
import type { PRICE_AUDIENCES } from '@masaha/shared/spaces';
import { englishPlural } from '../plural';

type Billing = (typeof SUBSCRIPTION_BILLINGS)[number];
type Audience = (typeof PRICE_AUDIENCES)[number];

/** A space's private packages, on its owner's Packages & prices. */
export const PACKAGES = {
  title: 'Private packages',
  description: 'Never shown to visitors.',
  add: 'New package',
  loadFailed: 'We couldn’t load the packages',
  empty: {
    title: 'No private packages',
    text: 'Create a package such as “10 days” or “20 hours”.',
  },
  /** The badge of a package no longer offered. */
  paused: 'Paused',
  available: 'Available',
  availableNamed: ({ name }: { name: string }) => `${name}: available`,
  edit: 'Edit',
  editNamed: ({ name }: { name: string }) => `Edit ${name}`,
  toggleFailed: ({ name }: { name: string }) => `Couldn’t change whether ${name} is offered`,
  /** Under a paused package that still holds a shift (finding 81). */
  heldShift: ({ shift }: { shift: string }) =>
    `Paused, but still holds the shift “${shift}”; the shift can’t be removed until it’s cleared here.`,
  clearShift: 'Clear the shift',
  clearShiftFailed: ({ name }: { name: string }) => `Couldn’t clear ${name}’s shift`,
  /** A package's terms, in one line. */
  summary: {
    validity: ({ count }: { count: number }) =>
      englishPlural(count, { one: 'valid 1 day', other: `valid ${String(count)} days` }),
    totalDays: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 day', other: `${String(count)} days` }),
    daysPerWeek: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 day a week', other: `${String(count)} days a week` }),
    hoursPerDay: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 hour a day', other: `${String(count)} hours a day` }),
    totalHours: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1-hour balance', other: `${String(count)}-hour balance` }),
    students: 'students',
    separator: ' · ',
  },
  /** A rate's line; a fixed price is its amount alone. */
  price: {
    perHour: ({ price }: { price: string }) => `${price} an hour`,
    perDay: ({ price }: { price: string }) => `${price} a day`,
  },
  sheet: {
    newTitle: 'New package',
    editTitle: 'Edit package',
    description: 'Private — never shown to visitors.',
    close: 'Close',
    name: 'Package name',
    validity: 'Validity (days)',
    validityHelp: 'A subscription ends this long after it starts.',
    limits: 'Limits',
    limitsHelp: 'Choose what applies; each limit shows its field.',
    optional: 'Optional',
    limitNames: {
      totalDays: 'Number of days',
      daysPerWeek: 'Days a week',
      hoursPerDay: 'Hours a day',
      totalHours: 'Total hours',
    },
    billing: 'Billing',
    billings: {
      FIXED: 'Fixed price',
      PER_HOUR: 'Per hour',
      PER_DAY: 'Per day',
    } satisfies Record<Billing, string>,
    /** The amount's label, by its billing. */
    amount: {
      FIXED: 'Total price (₪)',
      PER_HOUR: 'Price per hour (₪)',
      PER_DAY: 'Price per day (₪)',
    } satisfies Record<Billing, string>,
    audience: 'For',
    audiences: { GENERAL: 'Everyone', STUDENT: 'Students' } satisfies Record<Audience, string>,
    shift: 'Shift',
    noShift: 'No shift',
    noShifts: 'No shifts are saved yet.',
    addShifts: 'Add shifts in the opening hours',
    shiftsLoading: 'Loading the shifts…',
    summary: 'Summary',
    unnamed: 'Unnamed package',
    noPrice: 'No price yet',
    submit: 'Save package',
    failed: 'Couldn’t save the package',
  },
  saved: ({ name }: { name: string }) => `Package ${name} saved`,
  fieldErrors: {
    name: {
      required: 'Enter the package name',
      too_short: 'Enter the package name',
      not_unique: 'Another package, paused or not, has this name',
      too_long: 'The name is longer than 60 characters',
      invalid_format: 'Remove the characters that aren’t allowed',
    },
    /** The validity and the limits that count days or hours with no upper bound. */
    count: {
      required: 'Enter the number',
      out_of_range: 'A whole number from 1',
      invalid_format: 'A whole number from 1',
    },
    /** A limit turned on and left empty. */
    limitEmpty: 'Enter the number, or turn this limit off',
    daysPerWeek: { out_of_range: 'From 1 to 7' },
    hoursPerDay: { out_of_range: 'From 1 to 24' },
    amount: {
      required: 'Enter the price',
      out_of_range: 'Enter an amount above zero, up to ₪100,000',
      invalid_format: 'Enter an amount in shekels, up to two decimals',
    },
    shift: { invalid_choice: 'This shift no longer exists; choose another.' },
  },
  /** A write's refusals, in the owner's words: a 404 cannot tell its two causes apart. */
  refusals: {
    forbidden: 'This is no longer open to you at this space; nothing was saved.',
    not_found: 'This package no longer exists, or the space is no longer open to you.',
  },
} as const;
