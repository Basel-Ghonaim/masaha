import type { SessionSpaceLink } from '@masaha/shared/space-links';
import { apiClient } from '@shared/api';
import { establishSession, getSession, restoreSession, type Session } from '@shared/session';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter } from '../../../test/fakeAdapter';
import { aSession, appError, deferred, fakeEndpoints, fakeHint } from '../../../test/fakeSession';
import { startPreferences } from '../../../test/startPreferences';
import { RequireSpaceRole } from './RequireSpaceRole';

const FORBIDDEN = 'You don’t have access to this page';

/**
 * Two test routes of a space: its overview, for its owner only, and its desk, for its owner and its
 * reception; beside a sign-in page. Opened at `path`.
 */
function renderSpaceRoutes(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard/spaces/:spaceId',
        element: (
          <RequireSpaceRole roles={['OWNER']}>
            <p>The overview</p>
          </RequireSpaceRole>
        ),
      },
      {
        path: '/dashboard/spaces/:spaceId/desk',
        element: (
          <RequireSpaceRole roles={['OWNER', 'RECEPTION']}>
            <p>The desk</p>
          </RequireSpaceRole>
        ),
      },
      { path: '/login', element: <p>The sign-in page</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function signInWith(spaces: SessionSpaceLink[], role: 'USER' | 'OWNER' | 'ADMIN' = 'USER') {
  establishSession(aSession({ role, spaces }), { source: 'signIn' });
}

function where(router: ReturnType<typeof createMemoryRouter>) {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('RequireSpaceRole, signed in', () => {
  it('shows an owner-only page to the space’s owner', () => {
    signInWith([{ spaceId: 7, role: 'OWNER' }], 'OWNER');

    renderSpaceRoutes('/dashboard/spaces/7');

    expect(screen.getByText('The overview')).toBeInTheDocument();
  });

  it('shows a page for both roles to the space’s reception', () => {
    signInWith([{ spaceId: 7, role: 'RECEPTION' }]);

    renderSpaceRoutes('/dashboard/spaces/7/desk');

    expect(screen.getByText('The desk')).toBeInTheDocument();
  });

  it('shows the 403 state, without moving, to the space’s reception on an owner-only page', () => {
    signInWith([{ spaceId: 7, role: 'RECEPTION' }]);

    const router = renderSpaceRoutes('/dashboard/spaces/7');

    expect(screen.getByRole('heading', { name: FORBIDDEN })).toBeInTheDocument();
    expect(screen.queryByText('The overview')).not.toBeInTheDocument();
    expect(where(router)).toBe('/dashboard/spaces/7');
  });

  it('reads the role at the space in the URL, not at another space nor the global role', () => {
    signInWith(
      [
        { spaceId: 3, role: 'OWNER' },
        { spaceId: 7, role: 'RECEPTION' },
      ],
      'OWNER',
    );

    renderSpaceRoutes('/dashboard/spaces/7');

    expect(screen.getByRole('heading', { name: FORBIDDEN })).toBeInTheDocument();
    expect(screen.queryByText('The overview')).not.toBeInTheDocument();
  });

  it('shows the 403 state, without moving, for a valid space id the user holds no link to', () => {
    signInWith([{ spaceId: 7, role: 'OWNER' }], 'ADMIN');

    const router = renderSpaceRoutes('/dashboard/spaces/8/desk');

    expect(screen.getByRole('heading', { name: FORBIDDEN })).toBeInTheDocument();
    expect(screen.queryByText('The desk')).not.toBeInTheDocument();
    expect(where(router)).toBe('/dashboard/spaces/8/desk');
  });

  it.each(['abc', '0', '07', '-7'])(
    'shows the 404 state, without moving, for the space id %j',
    (spaceId) => {
      signInWith([{ spaceId: 7, role: 'OWNER' }], 'OWNER');

      const router = renderSpaceRoutes(`/dashboard/spaces/${spaceId}/desk`);

      expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
      expect(screen.queryByText('The desk')).not.toBeInTheDocument();
      expect(where(router)).toBe(`/dashboard/spaces/${spaceId}/desk`);
    },
  );
});

describe('RequireSpaceRole, before a session is held', () => {
  it('sends a guest to sign-in, carrying the page asked for', async () => {
    await restoreSession({ endpoints: fakeEndpoints(), hint: fakeHint(false) });

    const router = renderSpaceRoutes('/dashboard/spaces/7/desk?day=2');

    expect(await screen.findByText('The sign-in page')).toBeInTheDocument();
    expect(where(router)).toBe('/login?next=%2Fdashboard%2Fspaces%2F7%2Fdesk%3Fday%3D2');
  });

  it('shows the spinner while the session is restored, then the page', async () => {
    const answer = deferred<Session>();
    const restoring = restoreSession({
      endpoints: fakeEndpoints({ refresh: () => answer.promise }),
      hint: fakeHint(true),
    });

    renderSpaceRoutes('/dashboard/spaces/7/desk');

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('The desk')).not.toBeInTheDocument();
    await act(async () => {
      answer.resolve(aSession({ spaces: [{ spaceId: 7, role: 'RECEPTION' }] }));
      await restoring;
    });
    expect(screen.getByText('The desk')).toBeInTheDocument();
  });

  it('shows offline while no answer came back, and Try again re-runs the restore', async () => {
    const user = userEvent.setup();
    await restoreSession({
      endpoints: fakeEndpoints({ refresh: () => Promise.reject(appError('network', 0)) }),
      hint: fakeHint(true),
    });
    document.cookie = 'masaha_session=1; Path=/';
    const server = fakeAdapter(() => ({
      status: 200,
      data: { success: true, data: aSession({ spaces: [{ spaceId: 7, role: 'OWNER' }] }) },
    }));
    apiClient.defaults.adapter = server.adapter;
    renderSpaceRoutes('/dashboard/spaces/7');

    expect(screen.getByRole('heading', { name: 'No internet connection' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(getSession().status).toBe('authenticated');
    });
    expect(server.requests.map(({ url }) => url)).toEqual(['/auth/refresh']);
    expect(await screen.findByText('The overview')).toBeInTheDocument();
  });

  it('shows the general error when the answer was no verdict', async () => {
    await restoreSession({
      endpoints: fakeEndpoints({ refresh: () => Promise.reject(appError('server', 503)) }),
      hint: fakeHint(true),
    });

    renderSpaceRoutes('/dashboard/spaces/7');

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.queryByText('The overview')).not.toBeInTheDocument();
  });
});
