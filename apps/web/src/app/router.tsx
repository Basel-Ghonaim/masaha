import { siteRoutes } from '@pages/site';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RootLayout } from './RootLayout';

// The page groups' subtrees, under the root (docs/frontend/architecture.md §2).
const children: RouteObject[] = [...siteRoutes];

// The design-system showcase is a development tool (docs/frontend/architecture.md §2). A build
// replaces import.meta.env.DEV with false, which drops this branch and the showcase with it;
// check:build proves the build holds none of it.
if (import.meta.env.DEV) {
  const { showcaseRoutes } = await import('@pages/showcase');
  children.push(...showcaseRoutes);
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    // The first page's code is still loading: nothing to show yet.
    HydrateFallback: () => null,
    children,
  },
]);
