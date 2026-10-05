import type { Catalogue } from '@shared/copy';
import { CHANGE_PASSWORD_PATH, RESET_PASSWORD_PATH } from '@shared/routing';

/** The anchor of the about page's contact section. */
export const CONTACT_ANCHOR = 'contact';

const ABOUT = '/about';

/** Where the site's pages live. The routes and every link to them read these paths. */
export const SITE_PATHS = {
  home: '/',
  spaces: '/spaces',
  about: ABOUT,
  /** The about page's contact section, which the footer links to. */
  contact: `${ABOUT}#${CONTACT_ANCHOR}`,
  signIn: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  /** Where a reset link opens, which shared/routing's gate lets through. */
  resetPassword: RESET_PASSWORD_PATH,
  /** Where shared/routing sends a user with a temporary password to change. */
  changePassword: CHANGE_PASSWORD_PATH,
} as const;

type SiteLink = {
  name: keyof Catalogue['site']['links'];
  to: string;
  /** Current on its own path only, not on the paths below it. */
  end?: boolean;
};

/** The header's links, in order; the phone menu lists the same. */
export const SITE_LINKS: readonly SiteLink[] = [
  { name: 'home', to: SITE_PATHS.home, end: true },
  { name: 'spaces', to: SITE_PATHS.spaces },
  { name: 'about', to: SITE_PATHS.about },
];
