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
  /** The visits closed with something left to collect (K6, DK-012). */
  uncollected: {
    title: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: '1 visit not collected',
        other: `${String(count)} visits not collected`,
      }),
    none: 'Nothing left to collect.',
    loadFailed: 'We couldn’t load the uncollected visits',
    /** How a row closed, and when: the auto check-out, or by hand (a payment voided since). */
    how: ({ day, range }: { day: string; range: string }) =>
      `Auto check-out at closing · ${day} ${range}`,
    howManual: ({ day, range }: { day: string; range: string }) =>
      `Checked out by hand · ${day} ${range}`,
    today: 'today',
    yesterday: 'yesterday',
    unpriced: 'No price',
    showAll: ({ count }: { count: number }) => `Show all (${String(count)})`,
    showFewer: 'Show fewer',
    collect: 'Collect',
    debt: 'Record a debt',
    more: ({ name }: { name: string }) => `More actions for ${name}’s visit`,
    writeOff: 'Write off…',
    pagination: {
      label: 'Pages of uncollected visits',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
  collect: {
    title: ({ name }: { name: string }) => `Collect a visit · ${name}`,
    note: 'Note',
    submit: ({ amount }: { amount: string }) => `Record ${amount}`,
    submitEmpty: 'Record payment',
    failed: 'We couldn’t record the payment',
    done: ({ name, day }: { name: string; day: string }) => `${name} · visit of ${day}`,
  },
  debt: {
    name: 'Name',
    phone: 'Mobile number',
    phoneRequired: 'A mobile number is needed to record the debt, e.g. +970 59 000 0000',
    adds: ({ name }: { name: string }) => `Added to ${name}’s file`,
    title: ({ name }: { name: string }) => `Record a debt · ${name}`,
    text: ({ amount }: { amount: string }) =>
      `${amount} stays owed by this number’s holder; a customer file is created if there is none.`,
    submit: 'Record the debt',
    done: ({ amount, name }: { amount: string; name: string }) =>
      `${amount} recorded as a debt for ${name}`,
    failed: 'We couldn’t record the debt',
  },
  /** The visits closed with no price, for whoever may type one (S5). */
  unpriced: {
    title: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: '1 visit without a price',
        other: `${String(count)} visits without a price`,
      }),
    price: 'Set the price',
    dialogTitle: ({ name }: { name: string }) => `Price a visit · ${name}`,
    submit: 'Save the price',
    done: ({ name, amount }: { name: string; amount: string }) =>
      `${name}’s visit priced at ${amount}`,
    failed: 'We couldn’t save the price',
    loadFailed: 'We couldn’t load the visits without a price',
  },
  /** The owner's write-off of what a visit still owes (K6), and its undo from the notice (DI-29). */
  writeOff: {
    title: 'Write off this visit?',
    text: ({ who, day, amount }: { who: string; day: string; amount: string }) =>
      `${who} · ${day} · ${amount}. It leaves “Not collected” (and its customer’s debt, if it has one). It isn’t a payment or a deletion: it stays on record with the reason, and it can be undone from the notice.`,
    reason: 'Reason',
    reasonRequired: 'Write the reason',
    confirm: 'Write off',
    back: 'Back',
    done: ({ amount, who }: { amount: string; who: string }) => `${amount} written off · ${who}`,
    undo: 'Undo',
    undone: 'The visit is back in “Not collected”',
    undoFailed: 'We couldn’t undo the write-off',
    failed: 'We couldn’t write it off',
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
    VISIT_ALREADY_PAID: 'Nothing is owed on this visit any more.',
    VISIT_NOT_PRICED: 'This visit has no price yet; it is priced first.',
    VISIT_ALREADY_PRICED: 'This visit already has a price.',
    PRICE_TYPING_NOT_ALLOWED: 'Reception may no longer type a price at this space.',
    forbidden: 'This is no longer open to you at this space.',
    conflict: 'This request clashed with an earlier one; close it and open it again.',
    not_found: 'This visit no longer exists.',
  },
  /** The desk's one search: the people present, then the customers, then a visit (K1). */
  search: {
    /** The search's region. */
    region: 'Search',
    label: 'Search by name or the mobile’s last digits',
    placeholder: 'Name or the mobile’s last digits',
    /** The second group's heading. */
    customers: 'Customers',
    /** The results' count, said politely as they change. */
    found: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 result', other: `${String(count)} results` }),
    checkInNamed: ({ name }: { name: string }) => `Check in a visit for “${name}”`,
    none: {
      title: 'No one by this name or number',
      text: 'A one-off visitor? Check them in as a visit (no customer file is created).',
    },
    failed: 'We couldn’t search the customers',
  },
  /** A customer's card in the search. */
  customer: {
    noPhone: 'No mobile number',
    noSubscription: 'No subscription',
    until: ({ date }: { date: string }) => `until ${date}`,
    noEnd: 'No end date',
    statuses: {
      UPCOMING: 'Not started',
      ACTIVE: 'Active',
      ENDING_SOON: 'Ending soon',
      EXPIRED: 'Expired',
    },
    owes: ({ amount }: { amount: string }) => `Owes ${amount}`,
    credit: ({ amount }: { amount: string }) => `In credit ${amount}`,
    settled: 'Settled',
    /** A customer's one-tap check-in, and its accessible name. */
    checkIn: 'Check in',
    checkInName: ({ name }: { name: string }) => `Check in ${name}`,
    receive: ({ amount }: { amount: string }) => `Receive ${amount}`,
    /** A customer's «⋯» (DI-39), named by them. */
    menu: {
      label: ({ name }: { name: string }) => `More actions: ${name}`,
      file: 'Customer file',
      edit: 'Edit details',
      archive: 'Archive…',
      restore: 'Restore',
    },
  },
  /** A subscriber's check-in and check-out at the desk. */
  subscriber: {
    /** The choice before a check-in on no subscription, an expired one or one not started (DI-14). */
    pre: {
      title: ({ name }: { name: string }) => `Check in · ${name}`,
      none: 'No subscription.',
      expired: ({ name, date }: { name: string; date: string }) =>
        `The subscription “${name}” ended on ${date}.`,
      upcoming: ({ name, date }: { name: string; date: string }) =>
        `The subscription “${name}” starts on ${date}.`,
      asVisit: 'Check in as a visit',
      startFailed: 'We couldn’t read when the subscription starts',
      asVisitNote: 'A visit is recorded under their name; it isn’t added to their file.',
      anyway: 'Check in anyway',
      back: 'Back',
    },
    in: {
      done: ({ name }: { name: string }) => `${name} checked in`,
      failed: 'We couldn’t check them in',
      alreadyHere: ({ name }: { name: string }) => `${name} is already here.`,
    },
    out: {
      done: ({ name }: { name: string }) => `${name} checked out`,
      stay: ({ time }: { time: string }) => `Stayed ${time}`,
      owes: ({ amount }: { amount: string }) => `${amount} stays on the subscription`,
      /** The toast's action: the payment on that subscription. */
      receive: 'Receive',
      failed: 'We couldn’t check them out',
    },
    /** A subscription's progress, in the present list and the file. */
    progress: {
      days: ({ used, total }: { used: string; total: string }) => `Days ${used} of ${total}`,
      week: ({ used, total }: { used: string; total: string }) => `This week ${used} of ${total}`,
      today: ({ used, total }: { used: string; total: string }) => `Today ${used} of ${total} h`,
      hours: ({ used, total }: { used: string; total: string }) => `Hours ${used} of ${total} h`,
      billed: ({ rate, unit }: { rate: string; unit: string }) =>
        `Billed from attendance: ${rate} ${unit}`,
      units: { PER_HOUR: 'per hour', PER_DAY: 'per day' },
      validUntil: ({ date }: { date: string }) => `Valid until ${date}`,
      endedOn: ({ date }: { date: string }) => `Ended ${date}`,
      startsOn: ({ date }: { date: string }) => `Starts ${date}`,
      noEnd: 'No end date',
    },
  },
  /** A payment on one of a customer's items (DI-22). */
  pay: {
    title: 'Receive a payment',
    titleFor: ({ name }: { name: string }) => `Receive a payment · ${name}`,
    /** The picker's search. */
    choose: 'Choose the customer',
    owing: 'Customers who owe:',
    pick: 'Choose',
    another: 'Another customer',
    noCustomer: 'No customer with this name or number.',
    item: 'The payment is for',
    itemVisit: ({ day }: { day: string }) => `Visit of ${day}`,
    itemLine: ({ due, paid, left }: { due: string; paid: string; left: string }) =>
      `Due ${due} · Paid ${paid} · Left ${left}`,
    owesNothing: 'This customer owes nothing.',
    usageNote: 'Billed from attendance: anything extra becomes credit.',
    submit: ({ amount }: { amount: string }) => `Record ${amount}`,
    done: ({ name, item, left }: { name: string; item: string; left: string }) =>
      `${name} · ${item} · ${left} left`,
    failed: 'We couldn’t record the payment',
    fileFailed: 'We couldn’t load what the customer owes',
  },
  /** «الزبائن»: the space's customers, searched and filtered (S11). */
  customers: {
    label: 'The space’s customers',
    columns: {
      name: 'Name',
      subscription: 'Subscription',
      status: 'Status',
      balance: 'Balance',
      actions: 'Actions',
    },
    status: { label: 'Filter by status', all: 'All', ARCHIVED: 'Archived' },
    kind: {
      label: 'Subscription type',
      options: {
        all: 'All types',
        PACKAGE: 'Package',
        CUSTOM: 'Custom',
        NONE: 'No subscription',
      },
    },
    payment: {
      label: 'Payment',
      options: {
        all: 'All payment states',
        OWES: 'Owes money',
        CREDIT: 'In credit',
        SETTLED: 'Settled',
      },
    },
    filters: {
      title: 'Filters',
      applied: ({ count }: { count: number }) =>
        englishPlural(count, {
          one: '1 filter applied',
          other: `${String(count)} filters applied`,
        }),
      show: ({ count }: { count: number }) =>
        englishPlural(count, { one: 'Show 1 customer', other: `Show ${String(count)} customers` }),
      clear: 'Clear filters',
      close: 'Close',
    },
    count: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 customer', other: `${String(count)} customers` }),
    empty: {
      title: 'No customers yet',
      text: 'A customer is added with their first subscription, or when a visitor leaves without paying.',
    },
    noMatch: {
      title: 'No customers match',
      text: 'Try another name or number, or change the filters.',
    },
    archivedEmpty: 'No archived customers',
    loadFailed: 'We couldn’t load the customers',
    pagination: {
      label: 'Pages of customers',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
  /** «ملف الزبون»: a customer's file (screen 15). */
  file: {
    title: 'Customer file',
    breadcrumb: 'Breadcrumb',
    notFound: {
      title: 'We couldn’t find this customer',
      text: 'They may not be a customer of this space.',
    },
    balance: 'Balance',
    archived: 'Archived',
    here: 'Here now',
    loadFailed: 'We couldn’t load the customer’s file',
    unpaid: { title: 'Unpaid visits', unpriced: 'Not priced yet' },
    subscriptions: {
      title: 'Subscriptions',
      none: 'No subscriptions',
      onlyVisits: 'This customer only comes for visits.',
    },
    card: {
      dates: ({ from, to }: { from: string; to: string }) => `${from} – ${to}`,
      typed: 'Typed price',
      terms: {
        totalDays: ({ count }: { count: number }) =>
          englishPlural(count, { one: '1 day', other: `${String(count)} days` }),
        daysPerWeek: ({ count }: { count: number }) => `${String(count)} a week`,
        hoursPerDay: ({ count }: { count: number }) => `${String(count)} h a day`,
        totalHours: ({ count }: { count: number }) => `${String(count)} h in all`,
        student: 'Students',
        none: 'No extra terms',
      },
      due: 'Due',
      dueSoFar: 'Due so far',
      paid: 'Paid',
      left: 'Left',
      pay: { paid: 'Paid', partial: 'Partly paid', unpaid: 'Unpaid' },
      receiveLeft: 'Receive what’s left',
    },
  },
  /** A customer's name and phone, edited (finding 123). */
  edit: {
    title: 'Edit details',
    name: 'Name',
    phone: 'Mobile number',
    optional: 'Optional',
    phoneHelp: 'Debt reminders go to this number on WhatsApp.',
    save: 'Save',
    nothingChanged: 'Nothing changed',
    done: ({ name }: { name: string }) => `${name}’s details saved`,
    failed: 'We couldn’t save the details',
  },
  /** The owner's archive of a customer, and its restore (DK-014, P9). */
  archive: {
    done: ({ name }: { name: string }) => `${name} archived`,
    undo: 'Undo',
    restored: ({ name }: { name: string }) => `${name} restored`,
    title: ({ name }: { name: string }) => `Archive ${name}?`,
    text: ({ amount }: { amount: string }) =>
      `They owe ${amount}. The amount stays on their record; they leave the search and the desk, and stay under “Archived” in Customers.`,
    confirm: 'Archive anyway',
    back: 'Back',
    doneOwing: ({ name, amount }: { name: string; amount: string }) =>
      `${name} archived · owes ${amount}`,
    present: ({ name }: { name: string }) =>
      `${name} is here now; check them out before archiving.`,
    failed: 'We couldn’t archive them',
    restorePhoneTaken:
      'Their number now belongs to another customer; change one of them before restoring.',
    restoreFailed: 'We couldn’t restore them',
  },
  /** A subscription's statement, opened in its card (DI-43). */
  statement: {
    show: 'Show the statement',
    hide: 'Hide the statement',
    loadFailed: 'We couldn’t load the statement',
    checkIns: 'Attendance',
    columns: { day: 'Day', in: 'In', out: 'Out', duration: 'Duration' },
    here: 'Here now',
    auto: 'Auto check-out',
    noCheckIns: 'No attendance yet.',
    payments: 'Payments',
    noPayments: 'No payments yet.',
    voided: 'Voided',
    voidedReason: ({ reason }: { reason: string }) => `Voided: ${reason}`,
    renewal: ({ date }: { date: string }) => `A renewal would start on ${date}`,
  },
  /** Ending a subscription early. */
  end: {
    action: 'End subscription',
    title: 'End the subscription today?',
    text: ({ name, end }: { name: string; end: string }) =>
      `${name} · The end date becomes ${end}. Amounts paid and due don’t change.`,
    textWas: ({ name, end, was }: { name: string; end: string; was: string }) =>
      `${name} · The end date becomes ${end} instead of ${was}. Amounts paid and due don’t change.`,
    confirm: 'End subscription',
    back: 'Back',
    done: ({ name }: { name: string }) => `“${name}” ended today`,
    failed: 'We couldn’t end the subscription',
  },
} as const;
