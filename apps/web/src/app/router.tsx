import { createBrowserRouter, type RouteObject } from 'react-router';

const routes: RouteObject[] = [{ path: '/', element: <main /> }];

// The design-system showcase is a development tool (docs/frontend/architecture.md §2). A build
// replaces import.meta.env.DEV with false, which drops this branch and the showcase with it;
// check:build proves the build holds none of it.
if (import.meta.env.DEV) {
  const { showcaseRoutes } = await import('@pages/showcase');
  routes.push(...showcaseRoutes);
}

export const router = createBrowserRouter(routes);
