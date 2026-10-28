import {
  RequireAuth,
  RequireGuest,
  RequirePasswordChange,
  type TitledHandle,
} from '@shared/routing';
import type { RouteObject } from 'react-router';
import { SITE_PATHS } from './navigation';
import { SiteRouteError } from './shell/SiteRouteError';

/**
 * The site's route subtree (docs/frontend/architecture.md §2). Definitions only: the shells and each
 * page load lazily, so the site downloads one page at a time and never the dashboard. A guard sits
 * visibly on each route that has one, and each page's route says its title.
 */
export const siteRoutes: RouteObject[] = [
  {
    lazy: async () => ({ Component: (await import('./shell/SiteLayout')).SiteLayout }),
    children: [
      {
        // The site's error boundary. A boundary renders in place of its own route's element, so it
        // sits one level below the shell, and every page's error shows inside the shell. It is not
        // lazy: it is what shows when a page's code cannot be fetched.
        ErrorBoundary: SiteRouteError,
        children: [
          {
            path: SITE_PATHS.home,
            handle: { title: (copy) => copy.site.links.home } satisfies TitledHandle,
            lazy: async () => ({ Component: (await import('./public/home/HomePage')).HomePage }),
          },
          {
            path: SITE_PATHS.spaces,
            handle: { title: (copy) => copy.site.links.spaces } satisfies TitledHandle,
            lazy: async () => ({
              Component: (await import('./public/directory/DirectoryPage')).DirectoryPage,
            }),
          },
          {
            path: SITE_PATHS.space,
            handle: { title: (copy) => copy.site.links.space } satisfies TitledHandle,
            lazy: async () => ({
              Component: (await import('./public/space/SpacePage')).SpacePage,
            }),
          },
          {
            path: SITE_PATHS.about,
            handle: { title: (copy) => copy.site.links.about } satisfies TitledHandle,
            lazy: async () => ({
              Component: (await import('./public/about/AboutPage')).AboutPage,
            }),
          },
          {
            // The account's pages, in its layout; each signed-in only, a guest sent to sign-in.
            lazy: async () => ({
              Component: (await import('./account/AccountLayout')).AccountLayout,
            }),
            children: [
              {
                path: SITE_PATHS.myReports,
                handle: { title: (copy) => copy.dataReports.mine.title } satisfies TitledHandle,
                lazy: async () => {
                  const { MyReportsPage } = await import('./account/MyReportsPage');
                  return {
                    element: (
                      <RequireAuth>
                        <MyReportsPage />
                      </RequireAuth>
                    ),
                  };
                },
              },
            ],
          },
          {
            path: '*',
            handle: { title: (copy) => copy.status.notFound.title } satisfies TitledHandle,
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
        ErrorBoundary: SiteRouteError,
        children: [
          {
            path: SITE_PATHS.signIn,
            handle: { title: (copy) => copy.auth.signIn.title } satisfies TitledHandle,
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
            handle: { title: (copy) => copy.auth.register.title } satisfies TitledHandle,
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
          {
            path: SITE_PATHS.forgotPassword,
            handle: { title: (copy) => copy.auth.forgotPassword.title } satisfies TitledHandle,
            lazy: async () => {
              const { ForgotPasswordPage } = await import('./auth/ForgotPasswordPage');
              return {
                element: (
                  <RequireGuest>
                    <ForgotPasswordPage />
                  </RequireGuest>
                ),
              };
            },
          },
          {
            // No guard: a signed-in person may open a reset link from their email. Wrapped by no
            // guard, its token never travels into a return URL.
            path: SITE_PATHS.resetPassword,
            handle: { title: (copy) => copy.auth.resetPassword.title } satisfies TitledHandle,
            lazy: async () => ({
              Component: (await import('./auth/ResetPasswordPage')).ResetPasswordPage,
            }),
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
        ErrorBoundary: SiteRouteError,
        children: [
          {
            path: SITE_PATHS.changePassword,
            handle: { title: (copy) => copy.users.passwordChange.title } satisfies TitledHandle,
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
