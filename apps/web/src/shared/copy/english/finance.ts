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
} as const;
