import { englishPlural } from '../plural';

/** Finance (screen 19), the owner's alone: U5's words. */
export const FINANCE = {
  loadFailed: 'Couldn’t load finance',
  tabs: { label: 'Reports', income: 'Income', debts: 'Debts', occupancy: 'Occupancy' },
  month: 'Month',
  /** The export, by the tab shown: a CSV built in the browser (no export route). */
  export: {
    more: 'More actions',
    income: 'Export income (CSV)',
    debts: 'Export debts (CSV)',
    occupancy: 'Export occupancy (CSV)',
    done: 'File downloaded',
  },
  income: {
    definition: 'Income = amounts actually collected, excluding voided payments.',
    today: 'Today',
    upTo: ({ time }: { time: string }) => `Up to ${time}`,
    vsPrevious: ({ change, month }: { change: string; month: string }) => `${change} vs ${month}`,
    allTime: 'All time',
    since: ({ month }: { month: string }) => `Since ${month}`,
    noPayments: 'No payments yet',
    series: { subscriptions: 'Subscriptions', visits: 'Visits' },
    byMonth: {
      title: 'Income by month',
      description: 'Last 12 months',
      chart: 'Income by month, last 12 months',
      period: 'Month',
    },
    byDay: {
      title: 'Visit income per day',
      description: 'Last 30 days',
      chart: 'Visit income per day, last 30 days',
      period: 'Day',
    },
    collections: {
      title: 'Collections by staff member',
      columns: {
        staff: 'Staff',
        count: 'Count',
        total: 'Total',
        cash: 'Cash',
        transfer: 'Transfer',
      },
      none: 'No collections this month.',
    },
    csv: { month: 'Month', subscriptions: 'Subscriptions', visits: 'Visits', total: 'Total' },
  },
  /** Who owes, who is in credit, and who paid in the month (D5.4). */
  debts: {
    tiles: {
      owed: 'Total owed',
      credit: 'Customer credit',
      creditHelper: ({ customers }: { customers: string }) => `${customers} paid in advance`,
      paid: ({ month }: { month: string }) => `Paid in ${month}`,
      uncollected: 'Uncollected visits',
      uncollectedHelper: ({ amount }: { amount: string }) => `${amount} · never added to the debts`,
      unpriced: ({ count }: { count: number }) => ` · ${String(count)} with no price`,
    },
    customers: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: `${String(count)} customer`,
        other: `${String(count)} customers`,
      }),
    visits: ({ count }: { count: number }) =>
      englishPlural(count, { one: `${String(count)} visit`, other: `${String(count)} visits` }),
    owes: {
      title: 'Customers who owe',
      description: 'Largest first',
      archived: 'Archived',
      since: ({ date, item }: { date: string; item: string }) =>
        `Since ${date} · oldest item: ${item}`,
      items: { VISIT: 'Visit', SUBSCRIPTION: 'Subscription' },
      amount: ({ amount }: { amount: string }) => `Owes ${amount}`,
      whatsapp: 'WhatsApp reminder',
      receive: 'Receive payment',
      empty: 'No one owes anything',
      pages: 'Pages of customers who owe',
    },
    credit: {
      title: 'In credit',
      description: 'Paid in advance beyond their use',
      amount: ({ amount }: { amount: string }) => `In credit ${amount}`,
      none: 'No one is in credit.',
      pages: 'Pages of customers in credit',
    },
    payers: {
      line: ({ paid, date }: { paid: string; date: string }) => `${paid} · last paid ${date}`,
      viewAll: 'View all',
      none: 'No one paid this month.',
    },
    csv: {
      name: 'Name',
      phone: 'Phone',
      amount: 'Amount',
      since: 'Since',
      oldest: 'Oldest item',
      archived: 'Archived',
      yes: 'Yes',
    },
    exportFailed: 'Couldn’t export the debts',
  },
} as const;
