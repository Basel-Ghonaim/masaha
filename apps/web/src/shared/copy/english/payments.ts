import { englishPlural } from '../plural';

/** The space's payments: the owner's ledger (screen 17). */
export const PAYMENTS = {
  ledger: {
    label: 'Payments ledger',
    columns: {
      date: 'Date',
      customer: 'Customer',
      amount: 'Amount',
      recorder: 'Recorded by',
      actions: 'Actions',
    },
    visit: 'Visit',
    noName: 'Visitor',
    range: {
      label: 'Period',
      choose: 'Choose a period',
      today: 'Today',
      tooLong: 'The longest period is 92 days; choose a shorter one.',
      previous: 'Previous month',
      next: 'Next month',
    },
    staff: {
      label: 'Staff',
      all: 'All staff',
      self: ({ name }: { name: string }) => `${name} (you)`,
      inactive: ({ name }: { name: string }) => `${name} · deactivated`,
    },
    method: { label: 'Method', all: 'All methods' },
    kind: {
      label: 'Type',
      all: 'All types',
      VISIT: 'Visits',
      SUBSCRIPTION: 'Subscriptions',
    },
    voided: {
      chip: 'Show voided',
      quick: 'Quick filter',
      badge: 'Voided',
      line: ({ name, reason }: { name: string; reason: string }) => `Voided by ${name}: ${reason}`,
    },
    filters: {
      title: 'Filters',
      clear: 'Clear filters',
      none: 'No results — change the filters',
      applied: ({ count }: { count: number }) =>
        englishPlural(count, {
          one: '1 filter applied',
          other: `${String(count)} filters applied`,
        }),
      show: ({ count }: { count: number }) =>
        englishPlural(count, { one: 'Show 1 payment', other: `Show ${String(count)} payments` }),
      close: 'Close',
    },
    count: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 payment', other: `${String(count)} payments` }),
    totals: ({
      period,
      received,
      cash,
      transfer,
      count,
    }: {
      period: string;
      received: string;
      cash: string;
      transfer: string;
      count: string;
    }) => `${period} · Total ${received} · Cash ${cash} · Transfer ${transfer} · ${count}`,
    totalsVoided: ({ count, amount }: { count: string; amount: string }) =>
      `Voided: ${count} · ${amount}`,
    emptyToday: {
      title: 'No payments today',
      text: 'Every payment recorded at the front desk shows up here. Choose a period to see earlier ones.',
    },
    noMatch: {
      title: 'No payments match the filters',
      text: 'Change the period or the filters.',
    },
    loadFailed: 'We couldn’t load the payments',
    pagination: {
      label: 'Pages of payments',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
} as const;
