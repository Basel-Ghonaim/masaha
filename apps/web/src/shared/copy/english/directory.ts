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
      /** Offered, chosen, only while near me sorts the list. */
      distance: 'By distance',
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
    /** The straight-line distance from the visitor's point, the number left to right. */
    distance: ({ km }: { km: string }) => `${km} km away`,
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
  /** Near me: the button, its state line and the privacy line. */
  near: {
    button: 'Nearest to me',
    locating: 'Finding your location…',
    /** Shown only while a location is being sent. */
    privacy: 'Your location is sent rounded, only to sort spaces by distance, and is never stored.',
    sorted: {
      device: 'Sorted by distance from your location.',
      pin: 'Sorted by distance from the point you set on the map.',
    },
    approximate: 'Distances are approximate, in a straight line.',
    /** On the map, which sends no location: the point is drawn there and orders the list. */
    onMap: 'Your location is shown on the map. The list is sorted by distance from it.',
    stop: 'Stop sorting by distance',
    clear: 'Clear my location',
    denied: {
      title: 'We couldn’t find your location',
      text: 'Choose your area or set your location on the map to sort the spaces by distance.',
    },
    imprecise: {
      title: 'We couldn’t find your location precisely',
      text: 'Your position seems to be outside the Gaza Strip, or off by more than 2 km, so we didn’t use it.',
    },
    chooseArea: 'Choose your area',
    /** The refused states' other way: a point set by hand on the map. */
    pickOnMap: 'Set my location on the map',
    /** Beside a point set by hand: set it again. */
    change: 'Change location',
  },
  /** Setting one's location by hand, at the map's centre. */
  pick: {
    title: 'Set your location on the map',
    text: 'Move the map until the mark is on your approximate location, or tap it. We sort the spaces by distance from it; it is sent rounded and never stored.',
    /** Read with the map while picking. */
    keys: 'The arrow keys move the map under the mark in the centre.',
    confirm: 'Set location here',
    back: 'Back',
  },
  /** The switch between the list and the map, its label read but not shown. */
  view: {
    label: 'View',
    list: 'List',
    map: 'Map',
  },
  /** The map of the spaces: its pins, its legend, the selected space and its notices. */
  map: {
    /** The map's own name, as an application the keys pan. */
    label: 'Map of spaces',
    /** The section around it. */
    region: 'Map',
    /** A pin's name, as a button: the space's name, not isolated (an attribute, never drawn), and its live status. */
    pin: ({ name, status }: { name: string; status: string }) => `${name} — ${status}`,
    legend: 'Map legend',
    centre: 'Centre on my location',
    /** The visitor's point on the map. */
    you: 'Your location',
    /** The visitor's point when set by hand. */
    yourPin: 'My location (manual)',
    details: 'View details',
    /** Below 768 px, read when a space is chosen: its sheet takes no focus. */
    detailsBelow: ({ name }: { name: string }) => `${name}: details at the bottom of the page`,
    close: 'Close',
    failed: 'The map didn’t load. Browse the spaces in the list.',
    /** While the pins are first asked for. */
    loading: 'Loading spaces…',
    /** Past the server's ceiling of pins (`count`, formatted), until the map is asked within its view. */
    truncated: ({ count }: { count: string }) =>
      `Showing the first ${count} spaces; zoom in to see the rest.`,
  },
} as const;
