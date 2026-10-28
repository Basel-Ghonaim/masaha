import { englishPlural } from '../plural';

/** The public site's shell: its header, its phone menu and its footer; then its pages' words. */
export const SITE = {
  wordmark: 'Masaha',
  /** The document's title, which the browser's tab shows: the page's own, then the site's name. */
  documentTitle: ({ page }: { page: string }) => `${page} · Masaha`,
  /** The shell's first link, shown once focused: it moves past the header to the page. */
  skipToContent: 'Skip to content',
  navigation: 'Main navigation',
  /** The header's links; each is also the title of the page it opens. */
  links: {
    home: 'Home',
    spaces: 'Spaces',
    about: 'About Masaha',
    /** A space's page, until its name is known. */
    space: 'Space',
  },
  signIn: 'Sign in',
  menu: 'Menu',
  closeMenu: 'Close menu',
  tagline: 'Masaha — a directory of coworking spaces in the Gaza Strip',
  contact: 'Contact us',
  browseSpaces: 'Browse spaces',
  /** The account's pages: their navigation and its links. */
  account: {
    navigation: 'My account',
    reports: 'My reports',
  },
  /** Home: the hero and its search, the areas, and the owners' card. */
  home: {
    title: 'Find a workspace in the Gaza Strip',
    lead: 'Opening hours, prices and live status of coworking spaces, in one place.',
    search: {
      label: 'Search for a space',
      placeholder: 'Space name or area',
      submit: 'Search',
    },
    areas: {
      title: 'Browse by area',
      all: 'All areas',
      strip: 'The Gaza Strip',
      /** How many spaces an area holds. */
      count: ({ count }: { count: number }) =>
        englishPlural(count, { one: `${String(count)} space`, other: `${String(count)} spaces` }),
      /** An area card's line: its governorate (or the Strip) and its count. */
      line: ({ place, count }: { place: string; count: string }) => `${place} · ${count}`,
      failed: 'We couldn’t load the areas',
    },
    owners: {
      title: 'Do you run a coworking space?',
      text: 'Contact us to add your space, manage its hours and prices, and show its live status.',
      action: 'Contact us',
    },
  },
  /** About (U11): what Masaha is, where its information comes from, the statuses, the contact. */
  about: {
    intro:
      'Masaha is a directory of coworking spaces in the Gaza Strip. It brings together each space’s hours, prices, amenities and contacts, and shows its live status if it’s verified, so you know before you leave whether it’s open and has room.',
    audience:
      'For remote workers, students, and anyone who needs a place with power and internet to work or study.',
    source: {
      title: 'Where does the information come from?',
      note: '“Updated” is the last time we confirmed the information or the space updated it. The longer ago, the more likely it has changed, so we show “May have changed” next to old information. If you find wrong information, contact us.',
    },
    verified: {
      title: 'Verified space',
      subtitle: 'Managed by the space itself',
      text: 'The space updates its hours, prices and announcements; its live status shows automatically, and the space can set it by hand for a short time.',
    },
    unverified: {
      title: 'Unverified space',
      subtitle: 'Collected by our team',
      text: 'Our team collected its information from the space and its public pages, and reviews it periodically. It has no live status.',
    },
    status: {
      title: 'What does the status mean?',
      available: 'Has room now; the status updates itself from who comes and goes at the space.',
      full: 'Open, but no free places right now.',
      closed: 'Outside opening hours, or temporarily closed by an announcement from the space.',
      none: 'The space isn’t verified, or its status isn’t set up, so it shows no live status. Check its hours or contact it.',
    },
    contact: {
      title: 'Contact us',
      text: 'Message us with a question, or a problem with the website.',
    },
    owners: {
      title: 'For space owners',
      /** The three steps, in order. */
      steps: [
        'Contact us with your space’s name and location.',
        'We confirm the information with you and create the space’s management account.',
        'Your space becomes verified: you keep its prices and hours yourself, and its live status shows automatically from check-ins.',
      ],
    },
  },
} as const;
