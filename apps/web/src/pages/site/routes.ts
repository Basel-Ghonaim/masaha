import { RouteErrorState } from '@shared/routing';
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
        // The site's error boundary. A boundary renders in place of its own route's element, so it
        // sits one level below the shell, and every page's error shows inside the shell. It is not
        // lazy: it is what shows when a page's code cannot be fetched.
        ErrorBoundary: RouteErrorState,
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
            lazy: async () => ({
              Component: (await import('./public/about/AboutPage')).AboutPage,
            }),
          },
          {
            path: '*',
            lazy: async () => ({
              Component: (await import('./public/not-found/NotFoundPage')).NotFoundPage,
            }),
          },
        ],
      },
    ],
  },
];
