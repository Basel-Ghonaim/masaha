import type { Catalogue } from '@shared/copy';
import { CHANGE_PASSWORD_PATH, RESET_PASSWORD_PATH } from '@shared/routing';

/** The anchor of the about page's contact section. */
export const CONTACT_ANCHOR = 'contact';

/** The anchor of the about page's section for space owners. */
export const OWNERS_ANCHOR = 'owners';

const ABOUT = '/about';

/** Where the site's pages live. The routes and every link to them read these paths. */
export const SITE_PATHS = {
  home: '/',
  spaces: '/spaces',
  /** A space's page, by its slug; links to it are built by shared/routing's `publicSpacePath`. */
  space: '/spaces/:slug',
  about: ABOUT,
  /** The about page's contact section, which the footer links to. */
  contact: `${ABOUT}#${CONTACT_ANCHOR}`,
  /** The about page's section for space owners, which Home's owners' card links to. */
  owners: `${ABOUT}#${OWNERS_ANCHOR}`,
  signIn: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  /** Where a reset link opens, which shared/routing's gate lets through. */
  resetPassword: RESET_PASSWORD_PATH,
  /** Where shared/routing sends a user with a temporary password to change. */
  changePassword: CHANGE_PASSWORD_PATH,
  /** The signed-in user's own reports (screen 11), under the account's layout. */
  myReports: '/me/reports',
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

/** An account page's link: its key names it in the account's navigation and the account menu. */
type AccountLink = {
  key: keyof Catalogue['site']['account'] & keyof Catalogue['users']['account']['links'];
  to: string;
};

/** The account's pages, in order: the account's navigation and the site's account menu list them. */
export const ACCOUNT_LINKS: readonly AccountLink[] = [{ key: 'reports', to: SITE_PATHS.myReports }];
