import { PasswordChangeGate, RouteErrorState } from '@shared/routing';
import { Outlet, ScrollRestoration } from 'react-router';

/**
 * The root of every route: it restores the scroll position, holds every route behind a pending
 * password change, and each domain's shell sits below.
 */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <PasswordChangeGate>
        <Outlet />
      </PasswordChangeGate>
    </>
  );
}

/** The last resort, when a shell itself fails: the error state, with no shell around it. */
export function RootError() {
  return (
    <main className="flex min-h-dvh flex-col">
      <RouteErrorState />
    </main>
  );
}
