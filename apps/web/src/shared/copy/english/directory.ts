import { englishPlural } from '../plural';

/** The site's directory of spaces: its list, its search, its order and its pages. */
export const DIRECTORY = {
  /** The page's heading. */
  title: 'Workspaces',
  search: {
    label: 'Search for a space',
    placeholder: 'Space name or area',
    /** A search of diacritics or tatweel only, which matches no letter. */
    refused: 'Type a letter of the space’s or its area’s name',
  },
  sort: {
    label: 'Sort',
    /** The trigger's text, the order chosen. */
    value: ({ sort }: { sort: string }) => `Sort: ${sort}`,
    options: {
      updated: 'Latest updates',
      name: 'By name',
      /** Offered only while a search is typed: the server's order then. */
      relevance: 'Best match',
    },
  },
  count: {
    /** Nothing narrows the list. Never drawn for none: the empty states say it. */
    all: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: `${String(count)} space in the Gaza Strip`,
        other: `${String(count)} spaces in the Gaza Strip`,
      }),
    /** A filter or a search narrows the list. */
    matching: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: `${String(count)} matching space`,
        other: `${String(count)} matching spaces`,
      }),
  },
  /** The results' heading, for assistive technology. */
  results: 'Results',
  loadFailed: 'We couldn’t load the spaces',
  /** A refetch failed while the cards already shown stay. */
  refreshFailed: 'We couldn’t refresh the list',
  /** No space at all, nothing narrowing the list. */
  empty: {
    title: 'No spaces in the directory yet',
    text: 'We add spaces as we go; come back soon.',
  },
  noMatch: {
    title: 'No spaces match your choice',
    text: 'Try removing some filters, or searching for another name.',
  },
  clearFilters: 'Clear filters',
  pagination: {
    label: 'Pages of the spaces',
    previous: 'Previous',
    next: 'Next',
    page: ({ page }: { page: number }) => `Page ${String(page)}`,
    summary: ({ page, total }: { page: number; total: number }) =>
      `Page ${String(page)} of ${String(total)}`,
    more: 'More pages',
  },
  card: {
    verified: 'Verified',
    /** Today's opening hours, the range left to right. */
    today: ({ range }: { range: string }) => `Today ${range}`,
    closedToday: 'Closed today',
    openAllDay: 'Open around the clock today',
  },
  status: {
    /** A space with no live status: unverified, or with no hours or capacity yet. */
    none: 'No live status',
  },
  /** The filters: a sidebar from 1024 px, a bottom sheet below it. */
  filters: {
    title: 'Filters',
    description: 'Applied to the results right away',
    /** The filters button's count, for assistive technology. */
    applied: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: `${String(count)} filter applied`,
        other: `${String(count)} filters applied`,
      }),
    /** The sheet's primary button: the spaces the filters leave. */
    show: ({ count }: { count: number }) =>
      englishPlural(count, {
        one: `Show ${String(count)} space`,
        other: `Show ${String(count)} spaces`,
      }),
    showNone: 'No results — change the filters',
    /** While the count is not known yet. */
    showLoading: 'Show results',
    clear: 'Clear',
    close: 'Close',
    spaces: 'Spaces',
    availableNow: 'Available now only',
    verified: 'Verified spaces only',
    availableNote: '“Available now” covers verified spaces only.',
    price: 'Price',
    period: 'Period',
    from: 'From',
    to: 'To',
    /** The amount's unit, shown at the start of each bound. */
    currency: '₪',
    periods: { HOUR: 'Hour', DAY: 'Day', WEEK: 'Week', MONTH: 'Month' },
    /** The chosen period, named in the help line. */
    rangeHelp: ({ period }: { period: string }) => `From and To apply to the ${period} price`,
    periodPrices: { HOUR: 'hour', DAY: 'day', WEEK: 'week', MONTH: 'month' },
    priceErrors: {
      invalid: 'Enter an amount in shekels, above zero',
      tooHigh: 'Enter an amount up to ₪100,000',
      belowMin: 'Below the minimum',
    },
    other: 'Other',
    studentPrices: 'Student prices',
    openFriday: 'Open on Friday',
  },
} as const;
