import {
  DocumentTitle,
  PasswordChangeGate,
  RecordTitleProvider,
  RouteErrorState,
} from '@shared/routing';
import { Outlet, ScrollRestoration } from 'react-router';

/**
 * The root of every route: it restores the scroll position, holds the name of the record a page
 * shows as its title, sets the document's title from it or from the route, holds every route behind
 * a pending password change, and each domain's shell sits below.
 */
export function RootLayout() {
  return (
    <RecordTitleProvider>
      <ScrollRestoration />
      <DocumentTitle />
      <PasswordChangeGate>
        <Outlet />
      </PasswordChangeGate>
    </RecordTitleProvider>
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
