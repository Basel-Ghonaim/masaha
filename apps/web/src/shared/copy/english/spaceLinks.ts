import type { FactGroup } from '@masaha/shared/spaces';

/** The user's links to spaces, in the dashboard: the space switcher and the admin's spaces list. */
export const SPACE_LINKS = {
  /** The switcher's name, with the space it shows. */
  switchSpace: ({ name }: { name: string }) => `Switch space: ${name}`,
  /** The switcher's list. */
  yourSpaces: 'Your spaces',
  /** The switcher, when the space in the address is none of the user's. */
  chooseSpace: 'Choose a space',
  loadFailed: 'Couldn’t load your spaces',
  /** The admin's spaces list: its filters, its table and cards, its states and its pages. */
  adminList: {
    /** Names the list: the table, the cards on a phone. */
    label: 'Spaces',
    search: 'Search',
    searchPlaceholder: 'Space name',
    /** The one field that chooses a governorate or one of its areas. */
    place: 'Governorate / area',
    status: 'Status',
    allStatuses: 'All statuses',
    /** A space's state, on its badge and as a filter's option. */
    states: {
      verified: 'Verified',
      unverified: 'Unverified',
      hidden: 'Hidden',
    },
    staleOnly: 'Stale data only',
    /** The phone's button that opens the filters, and its sheet's title. */
    filters: 'Filters',
    /** The phone's button's name while filters apply. */
    filtersApplied: ({ count }: { count: number }) => `Filters, ${String(count)} applied`,
    clearFilters: 'Clear filters',
    close: 'Close',
    columns: {
      space: 'Space',
      area: 'Area',
      status: 'Status',
      owner: 'Owner',
      freshness: 'Freshness',
      lastUpdate: 'Last update',
      actions: 'Actions',
    },
    /** A card's owners. */
    owners: ({ owners }: { owners: string }) => `Owner: ${owners}`,
    /** Read aloud in place of the dash of a space with no owner. */
    noOwner: 'No owner',
    upToDate: 'Up to date',
    stale: ({ groups }: { groups: string }) => `Stale: ${groups}`,
    missing: ({ groups }: { groups: string }) => `Missing: ${groups}`,
    /** A space's fact groups, as freshness names them. */
    groups: {
      profile: 'Profile',
      hours: 'Opening hours',
      prices: 'Prices',
      amenities: 'Amenities',
      contacts: 'Contacts',
    } satisfies Record<FactGroup, string>,
    /** Between the names of a list: fact groups, owners. */
    separator: ', ',
    /** The count of spaces the filters keep, under the table. */
    count: ({ count }: { count: number }) => `Spaces: ${String(count)}`,
    empty: 'No spaces yet',
    emptyHint: 'Spaces appear here once they are added.',
    noMatch: 'No spaces match the filters',
    loadFailed: 'We couldn’t load the spaces',
    pagination: {
      label: 'Pages of the spaces list',
      previous: 'Previous',
      next: 'Next',
      page: ({ page }: { page: number }) => `Page ${String(page)}`,
      /** Where the list is, on a phone. */
      summary: ({ page, total }: { page: number; total: number }) =>
        `Page ${String(page)} of ${String(total)}`,
      more: 'More pages',
    },
  },
} as const;
