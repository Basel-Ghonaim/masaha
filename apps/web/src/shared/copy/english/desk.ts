import { englishPlural } from '../plural';

/** The front desk: a visitor's check-in and check-out with its money, and the shared device's switch. */
export const DESK = {
  actions: {
    checkIn: 'Check in a visit',
    switchStaff: 'Switch staff',
    more: 'More actions',
  },
  switchStaff: {
    failed: 'We couldn’t sign out; try again.',
  },
  terms: {
    loadFailed: 'We couldn’t load the visit prices',
  },
  visit: {
    title: 'Check in a visit',
    noRecord: 'No customer file is created.',
    rate: {
      hour: ({ hour }: { hour: string }) => `Charged ${hour} an hour.`,
      hourCapped: ({ hour, day }: { hour: string; day: string }) =>
        `Charged ${hour} an hour, up to ${day}.`,
      day: ({ day }: { day: string }) => `Charged at the day price, ${day}.`,
      none: 'No published price; the amount is entered at check-out.',
    },
    name: 'Name',
    student: 'Student',
    shift: 'Shift',
    optional: 'Optional',
    noShift: 'No shift',
    full: 'The space is full; you can still check in, and visitors keep seeing “Full”.',
    submit: 'Check in',
    submitAnyway: 'Check in anyway',
    failed: 'We couldn’t check the visit in',
    done: ({ name }: { name: string }) => `${name} checked in`,
  },
  checkOut: {
    /** A present visit's button, and its accessible name. */
    open: 'Check out',
    openName: ({ name }: { name: string }) => `Check out ${name}`,
    title: ({ name }: { name: string }) => `Check out · ${name}`,
    visit: 'Visit',
    studentVisit: 'Visit · student',
    rows: { in: 'In', out: 'Out', duration: 'Duration' },
    billed: ({ time }: { time: string }) => `Billed time ${time}`,
    cap: 'Capped at the day price',
    /** The rounding by its rule; the other rules are said in the settings' own words. */
    rounding: {
      UP_AFTER_MINUTES: ({ minutes }: { minutes: string }) => `Rounded up after ${minutes}`,
    },
    minutes: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 minute', other: `${String(count)} minutes` }),
    typed: {
      amount: 'Visit amount (₪)',
      badge: 'Typed price',
      help: 'There’s no published hour or day price.',
      reason: 'Reason for the price',
    },
    unpriced: 'This visit has no price. It closes unpriced, and the owner prices it later.',
    submit: ({ amount }: { amount: string }) => `Check out and receive ${amount}`,
    submitNone: 'Check out without paying',
    failed: 'We couldn’t check out',
    quoteChanged: ({ amount }: { amount: string }) =>
      `The amount due changed to ${amount}; check it, then confirm.`,
    quoteFailed: 'We couldn’t work out the amount due',
    done: ({ name }: { name: string }) => `${name} checked out`,
  },
  money: {
    group: 'Payment',
    due: 'Due',
    received: 'Received now (₪)',
    prefilled: 'Filled with the amount due; change it if they pay another amount.',
    method: 'Method',
    methods: { CASH: 'Cash', TRANSFER: 'Transfer' },
    methodIn: { CASH: 'in cash', TRANSFER: 'by transfer' },
    full: 'Paid in full.',
    nothingDue: 'Nothing is due now.',
    change: ({ amount }: { amount: string }) => `${amount} change`,
    credit: ({ amount }: { amount: string }) => `${amount} becomes credit`,
    owes: ({ amount, name }: { amount: string; name: string }) => `${amount} stays owed by ${name}`,
    owesPhone: ({ amount }: { amount: string }) =>
      `${amount} stays owed by the mobile number’s holder — a mobile number is required`,
    onSubscription: ({ amount }: { amount: string }) => `${amount} stays on the subscription`,
    none: 'Paid nothing',
    all: 'Receive the full amount',
    amountInvalid: 'Enter an amount in shekels, up to two decimals',
    amountZero: 'Enter an amount above zero',
  },
  debt: {
    name: 'Name',
    phone: 'Mobile number',
    phoneRequired: 'A mobile number is needed to record the debt, e.g. +970 59 000 0000',
    adds: ({ name }: { name: string }) => `Added to ${name}’s file`,
  },
  toast: {
    paid: ({ amount, method }: { amount: string; method: string }) =>
      `${amount} received ${method}`,
    notPaid: 'Not paid',
    unpriced: 'Closed unpriced',
  },
  failure: {
    /** No answer came back: the first request may have landed, and the key makes a retry safe. */
    lost: 'No answer came back. Try again — it won’t be recorded twice.',
    /** The server refused: it wrote nothing. */
    nothing: 'Nothing was recorded.',
  },
  refusals: {
    VISIT_ALREADY_CLOSED:
      'Another desk checked this visit out first, so this payment wasn’t recorded. Don’t take the money twice.',
    PAYMENT_EXCEEDS_DUE: 'The amount is more than is due now; the amount due was updated.',
    VISIT_HAS_CUSTOMER: 'This visit belongs to another customer; their number can’t change here.',
    PRICE_TYPING_NOT_ALLOWED: 'Reception may no longer type a price at this space.',
    forbidden: 'This is no longer open to you at this space.',
    conflict: 'This request clashed with an earlier one; close it and open it again.',
    not_found: 'This visit no longer exists.',
  },
} as const;
