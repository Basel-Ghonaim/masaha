import { englishPlural } from '../plural';

/** The front desk's state now: who is present, and the live status visitors see, set by hand. */
export const OCCUPANCY = {
  present: {
    /** The section's heading, beside the count present (and the capacity). */
    title: 'Present now',
    /** Names the table, not the section. */
    table: 'People present',
    columns: {
      name: 'Name',
      kind: 'Type',
      since: 'Since',
      duration: 'Duration',
      detail: 'Usage',
      actions: 'Actions',
    },
    kinds: { VISIT: 'Visit', CHECK_IN: 'Subscription' },
    soFar: ({ amount }: { amount: string }) => `${amount} so far`,
    atCheckOut: 'Set at check-out',
    since: ({ time }: { time: string }) => `Since ${time}`,
    duration: ({ hours, minutes }: { hours: number; minutes: number }) =>
      `${String(hours)}h ${String(minutes)}m`,
    minutes: ({ minutes }: { minutes: number }) => `${String(minutes)}m`,
    subscribers: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 subscriber', other: `${String(count)} subscribers` }),
    visits: ({ count }: { count: number }) =>
      englishPlural(count, { one: '1 visit', other: `${String(count)} visits` }),
    summary: ({ subscribers, visits }: { subscribers: string; visits: string }) =>
      `${subscribers} · ${visits}`,
    empty: {
      title: 'No one is here right now',
      text: 'Search for a customer, or check in a visit for the first arrival.',
    },
    loadFailed: 'We couldn’t load who is present',
    refreshFailed: 'We couldn’t refresh; showing the last list.',
    /** The desk's search's first group: the people present who match. */
    matches: 'Here now',
  },
  status: {
    /** What the control shows from 768 px. */
    line: ({ state }: { state: string }) => `Visitors see: ${state}`,
    manual: ({ state, left }: { state: string; left: string }) =>
      `Visitors see: ${state}, set by hand · ${left}`,
    /** The control's accessible name, at every width. */
    name: ({ state }: { state: string }) => `Visitors see: ${state} — change it`,
    manualName: ({ state, left }: { state: string; left: string }) =>
      `Visitors see: ${state}, set by hand, ${left} left — change it`,
    none: 'No live status',
  },
  override: {
    title: 'What visitors see',
    for: 'For',
    durations: {
      MINUTES_30: '30 min',
      HOUR_1: '1 hour',
      HOURS_2: '2 hours',
      UNTIL_CLOSING: 'Until closing',
    },
    now: ({ state, left }: { state: string; left: string }) =>
      `Now: ${state}, set by hand · ${left} left`,
    back: 'Back to the automatic status',
    note: 'Then the status follows attendance again.',
    replaces: 'It replaces the current setting.',
    closed: 'The status can’t be set while the space is closed.',
    done: ({ state }: { state: string }) => `Visitors now see “${state}”`,
    cleared: 'The status is automatic again',
    failed: 'We couldn’t set the status',
  },
} as const;
