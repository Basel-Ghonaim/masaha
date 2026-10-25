import {
  DASHBOARD_PATHS,
  NotFoundState,
  RequireAuth,
  RequireRole,
  RequireSpaceRole,
  RouteErrorState,
  type TitledHandle,
} from '@shared/routing';
import type { ReactElement } from 'react';
import type { RouteObject } from 'react-router';
import {
  ADMIN_ADD_SPACE_PATH,
  ADMIN_NAV,
  ADMIN_SPACE_PATH,
  SPACE_NAV,
  type DashboardPageName,
} from './navigation';
import { placeOf } from './placeOf';

/** A page's title: its navigation item's name, as the catalogue words it. */
const titleOf = (name: DashboardPageName) =>
  ({ title: (copy) => copy.dashboard.pages[name] }) satisfies TitledHandle;

/** The 404's title, for each branch's pages that are not there. */
const NOT_FOUND = { title: (copy) => copy.status.notFound.title } satisfies TitledHandle;

/** The admin's pages that have a screen, each loaded lazily; the others show their placeholder. */
const ADMIN_PAGES: Partial<Record<DashboardPageName, RouteObject['lazy']>> = {
  spaces: async () => {
    const { SpacesPage } = await import('./admin/SpacesPage');
    return { element: <SpacesPage /> };
  },
  owners: async () => {
    const { OwnersPage } = await import('./admin/OwnersPage');
    return { element: <OwnersPage /> };
  },
  users: async () => {
    const { UsersPage } = await import('./admin/UsersPage');
    return { element: <UsersPage /> };
  },
  lookups: async () => {
    const { LookupsPage } = await import('./admin/LookupsPage');
    return { element: <LookupsPage /> };
  },
};

/** The space's pages that have a screen, each loaded lazily; the others show their placeholder. */
const SPACE_PAGES: Partial<Record<DashboardPageName, () => Promise<ReactElement>>> = {
  desk: async () => {
    const { DeskPage } = await import('./space/desk/DeskPage');
    return <DeskPage />;
  },
  packages: async () => {
    const { PackagesPage } = await import('./space/PackagesPage');
    return <PackagesPage />;
  },
  profile: async () => {
    const { ProfilePage } = await import('./space/ProfilePage');
    return <ProfilePage />;
  },
  settings: async () => {
    const { SettingsPage } = await import('./space/SettingsPage');
    return <SettingsPage />;
  },
  staff: async () => {
    const { StaffPage } = await import('./space/StaffPage');
    return <StaffPage />;
  },
};

/**
 * The dashboard's route subtree (docs/frontend/architecture.md §2, ADR 0016). Definitions only: the
 * shells and the pages load lazily, so the site's visitors never download them. A guard sits
 * visibly on each branch and each space page, with the roles its navigation item allows, and each
 * page's route says its title, which the top bar and the document's title show.
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
            handle: titleOf(name),
            lazy:
              ADMIN_PAGES[name] ??
              (async () => {
                const { PlaceholderPage } = await import('./PlaceholderPage');
                return { element: <PlaceholderPage /> };
              }),
          })),
          {
            path: ADMIN_ADD_SPACE_PATH,
            handle: { title: (copy) => copy.dashboard.addSpace.title } satisfies TitledHandle,
            lazy: async () => {
              const { AddSpacePage } = await import('./admin/AddSpacePage');
              return { element: <AddSpacePage /> };
            },
          },
          {
            // Titled until the space loads; then by its name, which the page gives.
            path: ADMIN_SPACE_PATH,
            handle: { title: (copy) => copy.dashboard.editSpace.title } satisfies TitledHandle,
            lazy: async () => {
              const { SpaceEditPage } = await import('./admin/SpaceEditPage');
              return { element: <SpaceEditPage /> };
            },
          },
          { path: '*', handle: NOT_FOUND, element: <NotFoundState /> },
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
            handle: titleOf(name),
            lazy: async () => {
              const page = SPACE_PAGES[name];
              const element = page
                ? await page()
                : await import('./PlaceholderPage').then(({ PlaceholderPage }) => (
                    <PlaceholderPage />
                  ));
              return { element: <RequireSpaceRole roles={roles}>{element}</RequireSpaceRole> };
            },
          })),
          { path: '*', handle: NOT_FOUND, element: <NotFoundState /> },
        ],
      },
    ],
  },
];
