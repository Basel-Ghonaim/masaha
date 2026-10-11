import {
  DASHBOARD_PATHS,
  NotFoundState,
  RequireAuth,
  RequireRole,
  RequireSpaceRole,
  RouteErrorState,
} from '@shared/routing';
import type { RouteObject } from 'react-router';
import { ADMIN_ADD_SPACE_PATH, ADMIN_NAV, SPACE_NAV, type DashboardPageName } from './navigation';
import { placeOf } from './placeOf';

/** The admin's pages that have a screen, each loaded lazily; the others show their placeholder. */
const ADMIN_PAGES: Partial<Record<DashboardPageName, RouteObject['lazy']>> = {
  spaces: async () => {
    const { SpacesPage } = await import('./admin/SpacesPage');
    return { element: <SpacesPage /> };
  },
  lookups: async () => {
    const { LookupsPage } = await import('./admin/LookupsPage');
    return { element: <LookupsPage /> };
  },
};

/**
 * The dashboard's route subtree (docs/frontend/architecture.md §2, ADR 0016). Definitions only: the
 * shells and the pages load lazily, so the site's visitors never download them. A guard sits
 * visibly on each branch and each space page, with the roles its navigation item allows.
 */
export const dashboardRoutes: RouteObject[] = [
  {
    path: DASHBOARD_PATHS.home,
    lazy: async () => {
      const { DashboardLanding } = await import('./DashboardLanding');
      return {
        element: (
          <RequireAuth>
            <DashboardLanding />
          </RequireAuth>
        ),
      };
    },
  },
  {
    path: DASHBOARD_PATHS.admin,
    lazy: async () => {
      const { AdminLayout } = await import('./shell/AdminLayout');
      return {
        element: (
          <RequireRole roles={['ADMIN']}>
            <AdminLayout />
          </RequireRole>
        ),
      };
    },
    children: [
      {
        // The dashboard's error boundary, one level below the shell so a page's error shows inside
        // it, as the site's does. It is not lazy: it is what shows when a page cannot be fetched.
        ErrorBoundary: RouteErrorState,
        children: [
          ...ADMIN_NAV.map(({ name, segment }): RouteObject => ({
            ...placeOf(segment),
            lazy:
              ADMIN_PAGES[name] ??
              (async () => {
                const { PlaceholderPage } = await import('./PlaceholderPage');
                return { element: <PlaceholderPage name={name} /> };
              }),
          })),
          {
            path: ADMIN_ADD_SPACE_PATH,
            lazy: async () => {
              const { AddSpacePage } = await import('./admin/AddSpacePage');
              return { element: <AddSpacePage /> };
            },
          },
          { path: '*', element: <NotFoundState /> },
        ],
      },
    ],
  },
  {
    path: DASHBOARD_PATHS.space,
    lazy: async () => {
      const { SpaceLayout } = await import('./shell/SpaceLayout');
      return {
        element: (
          <RequireAuth>
            <SpaceLayout />
          </RequireAuth>
        ),
      };
    },
    children: [
      {
        // The space branch's error boundary, below its shell, as the admin's.
        ErrorBoundary: RouteErrorState,
        children: [
          ...SPACE_NAV.map(({ name, segment, roles }): RouteObject => ({
            ...placeOf(segment),
            lazy: async () => {
              const { PlaceholderPage } = await import('./PlaceholderPage');
              return {
                element: (
                  <RequireSpaceRole roles={roles}>
                    <PlaceholderPage name={name} />
                  </RequireSpaceRole>
                ),
              };
            },
          })),
          { path: '*', element: <NotFoundState /> },
        ],
      },
    ],
  },
];
