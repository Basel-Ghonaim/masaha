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
} as const;
