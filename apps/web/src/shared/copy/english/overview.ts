import { englishPlural } from '../plural';

/** The owner's and the admin's overviews (screens 12 and 25): U5's words. */
export const OVERVIEW = {
  loadFailed: 'Couldn’t load the overview',
  /** The owner's overview of their space (screen 12): a work queue, never an amount (O3). */
  owner: {
    attention: {
      title: 'Needs your attention',
      review: 'Review',
      openDesk: 'Open the desk',
      view: 'View',
      /** A fact group never saved. */
      missing: {
        badge: 'Not added yet',
        caption: 'This section was never saved, so visitors don’t see it.',
      },
      /** A fact group older than the platform's thresholds, with the Gaza days since its date. */
      stale: {
        badge: 'Out of date',
        caption: ({ days }: { days: number }) =>
          days === 0
            ? 'Updated today'
            : englishPlural(days, {
                one: `Updated ${String(days)} day ago`,
                other: `Updated ${String(days)} days ago`,
              }),
      },
      reports: {
        title: ({ count }: { count: number }) =>
          englishPlural(count, {
            one: `${String(count)} new report`,
            other: `${String(count)} new reports`,
          }),
        caption: 'From visitors, about facts on the space page',
      },
      uncollected: {
        title: ({ count }: { count: number }) =>
          englishPlural(count, {
            one: `${String(count)} visit not collected`,
            other: `${String(count)} visits not collected`,
          }),
        caption: 'Left without paying, or checked out automatically',
      },
      unpriced: {
        title: ({ count }: { count: number }) =>
          englishPlural(count, {
            one: `${String(count)} visit with no price`,
            other: `${String(count)} visits with no price`,
          }),
        caption: 'Closed with no price; set it at the desk.',
      },
      owing: {
        title: ({ count }: { count: number }) =>
          englishPlural(count, {
            one: `${String(count)} customer owes money`,
            other: `${String(count)} customers owe money`,
          }),
        caption: 'The amounts are in Finance › Debts',
      },
      closures: {
        title: ({ count }: { count: number }) =>
          englishPlural(count, {
            one: `${String(count)} closure whose subscriptions are not extended`,
            other: `${String(count)} closures whose subscriptions are not extended`,
          }),
        caption: 'Extend the subscriptions it covered, once.',
      },
      capacity: {
        title: 'Capacity is not set',
        caption: 'Without it visitors see no live status.',
        action: 'Set the capacity',
      },
      allClear: 'All is in order',
    },
    present: {
      title: 'Present now',
      view: 'View who’s here',
      meter: 'Occupancy',
      /** The meter's value in words. */
      meterValue: ({ total, capacity }: { total: string; capacity: string }) =>
        `${total} of ${capacity}`,
      now: ({ members, visits }: { members: string; visits: string }) =>
        `Now: ${members} and ${visits}`,
      members: ({ count }: { count: number }) =>
        englishPlural(count, {
          one: `${String(count)} subscriber`,
          other: `${String(count)} subscribers`,
        }),
      visits: ({ count }: { count: number }) =>
        englishPlural(count, { one: `${String(count)} visit`, other: `${String(count)} visits` }),
      noCapacity: 'Set the capacity in Settings for a live status.',
      full: 'At capacity, so the space shows «Full».',
      hidden: 'Visitors never see capacity, only the state.',
    },
    announcements: { label: 'Active announcements' },
    ending: {
      title: 'Subscriptions ending this week',
      count: ({ count }: { count: number }) =>
        englishPlural(count, {
          one: `${String(count)} subscription`,
          other: `${String(count)} subscriptions`,
        }),
      viewAll: 'View all',
      today: 'Ends today',
      tomorrow: 'Ends tomorrow',
      /** Two days or more: today and tomorrow have their own lines. */
      inDays: ({ count }: { count: number }) =>
        englishPlural(count, {
          one: `Ends in ${String(count)} day`,
          other: `Ends in ${String(count)} days`,
        }),
      line: ({ subscription, ends }: { subscription: string; ends: string }) =>
        `${subscription} · ${ends}`,
      renew: 'Renew',
      none: 'No subscription ends this week.',
    },
  },
  /** The admin's overview of the platform (screen 25): nothing of a space's operations. */
  admin: {
    tiles: {
      label: 'Platform summary',
      spaces: {
        label: 'Spaces',
        helper: ({
          verified,
          unverified,
          hidden,
        }: {
          verified: string;
          unverified: string;
          hidden: string;
        }) => `${verified} verified · ${unverified} unverified · ${hidden} hidden`,
      },
      reports: {
        label: 'Open data reports',
        helper: ({ admin, owners }: { admin: string; owners: string }) =>
          `${admin} waiting for the admin · ${owners} waiting for owners`,
      },
      stale: {
        label: 'Stale or missing data',
        helper: 'By the platform’s freshness limits, or not added yet',
      },
      unverified: {
        label: 'Unverified spaces, no owner',
        helper: 'The admin edits them until an owner is linked',
      },
      users: { label: 'New users', helper: 'Last 30 days' },
    },
    completeness: {
      title: 'Data completeness',
      description:
        'The spaces the admin edits — the unverified ones, hidden ones included — that miss something or hold stale data. Verified spaces are their owners’ to update.',
      missing: ({ group }: { group: string }) => `${group} · not added yet`,
      stale: ({ group, days }: { group: string; days: number }) =>
        englishPlural(days, {
          one: `${group} · ${String(days)} day`,
          other: `${group} · ${String(days)} days`,
        }),
      edit: 'Edit',
      viewAll: 'View all',
      viewAllCounted: ({ total }: { total: string }) => `View all (${total})`,
      none: 'No space misses anything.',
    },
  },
} as const;
