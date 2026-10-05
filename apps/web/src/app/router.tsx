import { dashboardRoutes } from '@pages/dashboard';
import { siteRoutes } from '@pages/site';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RootError, RootLayout } from './RootLayout';

// The page groups' subtrees, under the root (docs/frontend/architecture.md §2).
const children: RouteObject[] = [...siteRoutes, ...dashboardRoutes];

// The design-system showcase is a development tool (docs/frontend/architecture.md §2). A build
// replaces import.meta.env.DEV with false, which drops this branch and the showcase with it;
// check:build proves the build holds none of it.
if (import.meta.env.DEV) {
  const { showcaseRoutes } = await import('@pages/showcase');
  children.push(...showcaseRoutes);
}

/** The app's route tree: the root, and every page group's subtree below it. */
export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    ErrorBoundary: RootError,
    // The first page's code is still loading: nothing to show yet.
    HydrateFallback: () => null,
    children,
  },
];

export const router = createBrowserRouter(routes);
