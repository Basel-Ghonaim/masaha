import { Outlet, ScrollRestoration } from 'react-router';

/** The root of every route: it restores the scroll position, and each domain's shell sits below. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
