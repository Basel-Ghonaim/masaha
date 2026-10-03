import type { RouteObject } from 'react-router';
import { SITE_PATHS } from './navigation';

/**
 * The site's route subtree (docs/frontend/architecture.md §2). Definitions only: the shell and each
 * page load lazily, so the site downloads one page at a time and never the dashboard.
 */
export const siteRoutes: RouteObject[] = [
  {
    lazy: async () => ({ Component: (await import('./shell/SiteLayout')).SiteLayout }),
    children: [
      {
        path: SITE_PATHS.home,
        lazy: async () => ({ Component: (await import('./public/home/HomePage')).HomePage }),
      },
      {
        path: SITE_PATHS.spaces,
        lazy: async () => ({
          Component: (await import('./public/directory/DirectoryPage')).DirectoryPage,
        }),
      },
      {
        path: SITE_PATHS.about,
        lazy: async () => ({ Component: (await import('./public/about/AboutPage')).AboutPage }),
      },
    ],
  },
];
