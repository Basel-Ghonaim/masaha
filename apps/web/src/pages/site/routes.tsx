import { RequireGuest, RequirePasswordChange, RouteErrorState } from '@shared/routing';
import type { RouteObject } from 'react-router';
import { SITE_PATHS } from './navigation';

/**
 * The site's route subtree (docs/frontend/architecture.md §2). Definitions only: the shells and each
 * page load lazily, so the site downloads one page at a time and never the dashboard. A guard sits
 * visibly on each route that has one.
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
  {
    lazy: async () => ({ Component: (await import('./shell/FocusLayout')).FocusLayout }),
    children: [
      {
        // The focus shell's own boundary, as the site shell has one.
        ErrorBoundary: RouteErrorState,
        children: [
          {
            path: SITE_PATHS.signIn,
            lazy: async () => {
              const { SignInPage } = await import('./auth/SignInPage');
              return {
                element: (
                  <RequireGuest>
                    <SignInPage />
                  </RequireGuest>
                ),
              };
            },
          },
          {
            path: SITE_PATHS.register,
            lazy: async () => {
              const { RegisterPage } = await import('./auth/RegisterPage');
              return {
                element: (
                  <RequireGuest>
                    <RegisterPage />
                  </RequireGuest>
                ),
              };
            },
          },
        ],
      },
    ],
  },
  {
    // The forced password change: the focus shell, whose short header offers only signing out.
    lazy: async () => {
      const [{ FocusLayout }, { SignOutButton }] = await Promise.all([
        import('./shell/FocusLayout'),
        import('@features/users'),
      ]);
      return { element: <FocusLayout actions={<SignOutButton />} /> };
    },
    children: [
      {
        ErrorBoundary: RouteErrorState,
        children: [
          {
            path: SITE_PATHS.changePassword,
            lazy: async () => {
              const { ChangePasswordPage } = await import('./auth/ChangePasswordPage');
              return {
                element: (
                  <RequirePasswordChange>
                    <ChangePasswordPage />
                  </RequirePasswordChange>
                ),
              };
            },
          },
        ],
      },
    ],
  },
];
