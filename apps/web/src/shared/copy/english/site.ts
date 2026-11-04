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
    /** The footer's link, not the header's. */
    privacy: 'Privacy Policy',
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
    favorites: 'Favourites',
    reports: 'My reports',
    settings: 'Account settings',
  },
  /** A guest's press of what needs an account: why to sign in, by the action (DI-60). */
  signInPrompt: {
    favorite: {
      title: 'Sign in to save spaces to your favourites',
      text: 'The spaces you save are in your account on any device.',
    },
    report: {
      title: 'Sign in to report information',
      text: 'So you’ll find the reply to your report in “My reports”.',
    },
    register: 'Create account',
    signIn: 'Sign in',
    close: 'Close',
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
      text: 'Contact us to add your space and manage its hours and prices; its live status shows automatically from the check-ins.',
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
      note: '“Updated” is the last time we confirmed the information or the space updated it. The longer ago, the more likely it has changed, so we show “May have changed” next to old information.',
      /** The note's last sentence, its link to the contact section in the middle (design issue 41). */
      wrong: 'If you find wrong information,',
      wrongLink: 'contact us',
      wrongEnd: '.',
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
      text: 'Write to us with a question, about a report that got no reply, or about a mistake on the site.',
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
  /**
   * The privacy policy (screen 33): the owner's approved text, word for word. A list's item is its
   * words, or its parts in order where some are bold (`strong`); each language has the same parts.
   */
  privacy: {
    updated: { label: 'Last updated:', date: '2026-11-05' },
    intro: {
      title: 'Introduction',
      text: 'Masaha brings the coworking spaces of the Gaza Strip together in one directory, and helps their owners run them. We respect your privacy and collect only what the platform needs to work. This page explains what we collect, why, who sees it, and how we protect it.',
    },
    collect: {
      title: 'What we collect',
      items: [
        [
          { strong: 'When you create an account:' },
          ' your name, your email address, your password, and the interface language you choose. We never store your password as it is: we store it encrypted in a way that cannot be reversed.',
        ],
        [
          { strong: 'When you sign in with Google:' },
          ' Google gives us only your name, your email and your Google account ID. We never see your Google password or any other data in your account.',
        ],
        [
          { strong: 'What you add yourself:' },
          " the spaces you save to your favourites, the reports you send about a space's information, and the replies to them.",
        ],
        [
          { strong: 'For space owners and their staff:' },
          " the space's information and photos, and what they record about their customers: name, mobile number, visits, subscriptions and payments. Masaha keeps this data on the space's behalf, and only its staff can see it.",
        ],
      ],
    },
    dontCollect: {
      title: "What we don't collect",
      items: [
        [
          { strong: 'Your location is never stored:' },
          ' when you use "Nearest to me", your location is rounded on your device (to about 100 metres) and sent only to sort spaces by distance; it is never stored or logged.',
        ],
        [
          { strong: 'No payment data:' },
          ' Masaha has no online payment at present, and we never ask for a bank card. Payments are recorded by hand at the space.',
        ],
        [
          { strong: 'No tracking, no ads:' },
          ' we use no third-party analytics, tracking or advertising tools.',
        ],
        [
          { strong: 'Photos without hidden data:' },
          ' before a photo is stored, we remove all its hidden data, such as where it was taken and the camera used.',
        ],
      ],
    },
    use: {
      title: 'How we use your data',
      items: [
        'To run your account and keep you signed in.',
        'To show the directory of spaces, keep your favourites and follow your reports.',
        'To run the dashboard for space owners and their staff.',
        'To email you a password reset link when you ask for one.',
        'To protect accounts from repeated sign-in attempts.',
      ],
      note: 'We do not sell your data, and we do not share it with anyone for marketing.',
    },
    cookies: {
      title: 'Cookies and browser storage',
      text: 'We use only the cookies needed to keep you signed in securely. Your browser also keeps some of your preferences, such as the language and the appearance (light or dark). We use no cookies for tracking or advertising.',
    },
    whoSees: {
      title: 'Who sees your data',
      items: [
        [{ strong: 'You:' }, ' you see your account, your favourites and your reports.'],
        [
          { strong: "A space's staff:" },
          " a space's owner and staff see only what belongs to their space, and nothing about other spaces.",
        ],
        [
          { strong: 'Reports:' },
          ' your report about a space reaches its owner ',
          { strong: 'without your name' },
          '.',
        ],
        [{ strong: 'The Masaha team:' }, ' to run the platform, answer reports and give support.'],
      ],
    },
    protect: {
      title: 'How we protect your data',
      items: [
        'Passwords are encrypted, and no one can read them, not even our team.',
        "Every user's permissions are checked on the server, on every request.",
        'Your session ends automatically after a set period, and a reception session ends after a period without use.',
        'We limit repeated sign-in attempts, and use your network address (IP) for this purpose only, and only temporarily.',
      ],
    },
    retention: {
      title: 'How long we keep data',
      items: [
        [
          'Your account stays as long as it is active. When you ask to close it, ',
          { strong: 'the account is suspended, not deleted' },
          ', in the current version of Masaha.',
        ],
        "Financial records and the audit log are kept, because they are part of the spaces' records and accounts.",
        'Password reset links and ended sessions are deleted automatically.',
      ],
    },
    rights: {
      title: 'Your rights',
      items: [
        'You can change your name, your language and how you sign in from "My account settings".',
        'You can ask us to suspend your account, or ask us about your data, by contacting us.',
      ],
    },
    changes: {
      title: 'Changes to this policy',
      text: 'We may update this policy when the platform changes. The date of the last update is shown at the top of this page.',
    },
    /** The sentence, then the platform's email (its button), then its end. */
    contact: {
      title: 'Contact us',
      text: 'For any question about your privacy:',
      end: '.',
    },
  },
} as const;
