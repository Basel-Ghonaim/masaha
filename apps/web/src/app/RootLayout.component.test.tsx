import { establishSession } from '@shared/session';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../test/fakeSession';
import { startPreferences } from '../test/startPreferences';
import { RootError, RootLayout } from './RootLayout';

function Broken(): never {
  throw new Error('The shell broke');
}

/** A shell with a header, which fails while it renders. */
function FailingShell() {
  return (
    <>
      <header />
      <Broken />
      <Outlet />
    </>
  );
}

beforeEach(() => {
  startPreferences('en');
  // jsdom does not scroll, and the root restores the scroll position.
  vi.stubGlobal('scrollTo', () => undefined);
  // React reports the error the shell throws; it is the scenario here, not a failure.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the root', () => {
  it('shows the general error in place of a shell that fails, with no header', async () => {
    const router = createMemoryRouter([
      {
        Component: RootLayout,
        ErrorBoundary: RootError,
        children: [{ Component: FailingShell, children: [{ path: '/', Component: () => null }] }],
      },
    ]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('holds every route behind a pending password change', async () => {
    establishSession(aSession({ mustChangePassword: true }), { source: 'signIn' });
    const router = createMemoryRouter(
      [
        {
          Component: RootLayout,
          children: [
            { path: '/spaces', Component: () => <p>The directory</p> },
            { path: '/change-password', Component: () => <p>The change page</p> },
          ],
        },
      ],
      { initialEntries: ['/spaces'] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('The change page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fspaces');
  });
});
