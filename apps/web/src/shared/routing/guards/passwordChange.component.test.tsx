import { apiClient } from '@shared/api';
import { establishSession, restoreSession, type SessionUser } from '@shared/session';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport } from '../../../test/fakeTransport';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { PasswordChangeGate } from './PasswordChangeGate';
import { RequirePasswordChange } from './RequirePasswordChange';

/**
 * A site page, a dashboard page, sign-in and the change page under its guard, all behind the gate
 * as the root mounts it, opened at `path`.
 */
function renderApp(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <PasswordChangeGate>
            <Outlet />
          </PasswordChangeGate>
        ),
        children: [
          { path: '/', element: <p>The home page</p> },
          { path: '/spaces', element: <p>The directory</p> },
          { path: '/dashboard/spaces/:spaceId/desk', element: <p>The front desk</p> },
          { path: '/dashboard/admin', element: <p>The admin overview</p> },
          { path: '/login', element: <p>The sign-in page</p> },
          { path: '/reset-password', element: <p>The reset page</p> },
          {
            path: '/change-password',
            element: (
              <RequirePasswordChange>
                <p>The change page</p>
              </RequirePasswordChange>
            ),
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function signIn(user: Partial<SessionUser> = {}) {
  establishSession(aSession(user), { source: 'signIn' });
}

function where(router: ReturnType<typeof createMemoryRouter>) {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(async () => {
  startPreferences('en');
  setSessionHint(false);
  await restoreSession();
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('PasswordChangeGate', () => {
  it.each([
    ['a site page', '/spaces?area=3', '/change-password?next=%2Fspaces%3Farea%3D3'],
    [
      'a dashboard page',
      '/dashboard/spaces/7/desk',
      '/change-password?next=%2Fdashboard%2Fspaces%2F7%2Fdesk',
    ],
  ])(
    'sends a user with a pending change from %s to the change, carrying the page',
    async (_, path, change) => {
      signIn({ mustChangePassword: true });

      const router = renderApp(path);

      expect(await screen.findByText('The change page')).toBeInTheDocument();
      expect(where(router)).toBe(change);
    },
  );

  it('exempts the change page itself', async () => {
    signIn({ mustChangePassword: true });

    const router = renderApp('/change-password');

    expect(await screen.findByText('The change page')).toBeInTheDocument();
    expect(where(router)).toBe('/change-password');
  });

  it.each(['/reset-password', '/reset-password/'])(
    'lets a reset link at %s through, its token never copied into a return URL',
    async (path) => {
      signIn({ mustChangePassword: true });

      const router = renderApp(`${path}#token=link-token`);

      expect(await screen.findByText('The reset page')).toBeInTheDocument();
      const { pathname, search, hash } = router.state.location;
      expect({ pathname, search, hash }).toEqual({
        pathname: path,
        search: '',
        hash: '#token=link-token',
      });
    },
  );

  it.each([
    ['a guest', () => undefined],
    [
      'a user without a pending change',
      () => {
        signIn();
      },
    ],
  ])('lets %s through', async (_, arrive) => {
    arrive();

    const router = renderApp('/spaces');

    expect(await screen.findByText('The directory')).toBeInTheDocument();
    expect(where(router)).toBe('/spaces');
  });

  it('shows a public page while the session is restored', async () => {
    const answer = deferred<FakeAnswer>();
    setSessionHint(true);
    fakeTransport(() => answer.promise);
    const restoring = restoreSession();

    renderApp('/spaces');

    expect(await screen.findByText('The directory')).toBeInTheDocument();
    await act(async () => {
      answer.resolve({ status: 401 });
      await restoring.catch(() => undefined);
    });
  });
});

describe('RequirePasswordChange', () => {
  it('sends the user on to the page they asked for once the change clears', async () => {
    signIn({ mustChangePassword: true });
    const router = renderApp('/change-password?next=%2Fspaces');
    expect(await screen.findByText('The change page')).toBeInTheDocument();

    signIn({ mustChangePassword: false });

    expect(await screen.findByText('The directory')).toBeInTheDocument();
    expect(where(router)).toBe('/spaces');
  });

  it.each([
    ['a user with no role and no links', {}, '/'],
    ['the admin', { role: 'ADMIN' as const }, '/dashboard/admin'],
  ])(
    'lands %s by the landing rule when no page was asked for',
    async (_, user: Partial<SessionUser>, landing) => {
      signIn(user);

      const router = renderApp('/change-password');

      await waitFor(() => {
        expect(where(router)).toBe(landing);
      });
    },
  );

  it('sends a guest, such as one who has just signed out there, to sign-in', async () => {
    const router = renderApp('/change-password?next=%2Fspaces');

    expect(await screen.findByText('The sign-in page')).toBeInTheDocument();
    expect(where(router)).toBe('/login');
  });

  it('shows the spinner while the session is restored', async () => {
    const answer = deferred<FakeAnswer>();
    setSessionHint(true);
    fakeTransport(() => answer.promise);
    const restoring = restoreSession();

    renderApp('/change-password');

    expect(await screen.findByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('The change page')).not.toBeInTheDocument();
    await act(async () => {
      answer.resolve({ status: 401 });
      await restoring.catch(() => undefined);
    });
  });
});
