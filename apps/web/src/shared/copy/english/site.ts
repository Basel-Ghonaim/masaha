/** The public site's shell: its header, its phone menu and its footer. */
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
  },
  signIn: 'Sign in',
  menu: 'Menu',
  closeMenu: 'Close menu',
  tagline: 'Masaha — a directory of coworking spaces in the Gaza Strip',
  contact: 'Contact us',
  browseSpaces: 'Browse spaces',
} as const;
