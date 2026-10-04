import { apiClient } from '@shared/api';
import {
  establishSession,
  getSession,
  restoreSession,
  type Session,
  type SessionUser,
} from '@shared/session';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter } from '../../../test/fakeAdapter';
import { aSession, appError, deferred, fakeEndpoints, fakeHint } from '../../../test/fakeSession';
import { startPreferences } from '../../../test/startPreferences';
import { RequireAuth } from './RequireAuth';
import { RequireGuest } from './RequireGuest';
import { RequireRole } from './RequireRole';

type Guard = (page: ReactNode) => ReactNode;

const requireAuth: Guard = (page) => <RequireAuth>{page}</RequireAuth>;
const requireAdmin: Guard = (page) => <RequireRole roles={['ADMIN']}>{page}</RequireRole>;
const requireGuest: Guard = (page) => <RequireGuest>{page}</RequireGuest>;

const GUARDS: [string, Guard][] = [
  ['RequireAuth', requireAuth],
  ['RequireRole', requireAdmin],
  ['RequireGuest', requireGuest],
];

/** A guarded page at /guarded, beside a sign-in page and a home page, opened at `path`. */
function renderGuarded(guard: Guard, path = '/guarded') {
  const router = createMemoryRouter(
    [
      { path: '/guarded', element: guard(<p>The guarded page</p>) },
      { path: '/login', element: <p>The sign-in page</p> },
      { path: '/', element: <p>The home page</p> },
      { path: '/me/favorites', element: <p>The favourites page</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function signIn(user: Partial<SessionUser> = {}) {
  establishSession(aSession(user), { source: 'signIn' });
}

async function becomeAnonymous() {
  await restoreSession({ endpoints: fakeEndpoints(), hint: fakeHint(false) });
}

async function becomeUnreachable(type: 'network' | 'server', status: number) {
  const endpoints = fakeEndpoints({ refresh: () => Promise.reject(appError(type, status)) });
  await restoreSession({ endpoints, hint: fakeHint(true) });
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

describe.each(GUARDS)('%s', (_, guard) => {
  it('shows the spinner while the session is restored', async () => {
    const answer = deferred<Session>();
    const restoring = restoreSession({
      endpoints: fakeEndpoints({ refresh: () => answer.promise }),
      hint: fakeHint(true),
    });

    renderGuarded(guard);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('The guarded page')).not.toBeInTheDocument();
    await act(async () => {
      answer.resolve(aSession({ role: 'ADMIN' }));
      await restoring;
    });
  });

  it('shows offline when no answer came back, and Try again re-runs the restore', async () => {
    const user = userEvent.setup();
    await becomeUnreachable('network', 0);
    document.cookie = 'masaha_session=1; Path=/';
    const server = fakeAdapter(() => ({
      status: 200,
      data: { success: true, data: aSession({ role: 'ADMIN' }) },
    }));
    apiClient.defaults.adapter = server.adapter;
    renderGuarded(guard);

    expect(screen.getByRole('heading', { name: 'No internet connection' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(getSession().status).toBe('authenticated');
    });
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]?.url).toBe('/auth/refresh');
    expect(
      screen.queryByRole('heading', { name: 'No internet connection' }),
    ).not.toBeInTheDocument();
  });

  it('shows the general error when the answer was no verdict, and Try again re-runs the restore', async () => {
    const user = userEvent.setup();
    await becomeUnreachable('server', 503);
    document.cookie = 'masaha_session=1; Path=/';
    const server = fakeAdapter(() => ({
      status: 200,
      data: { success: true, data: aSession({ role: 'ADMIN' }) },
    }));
    apiClient.defaults.adapter = server.adapter;
    renderGuarded(guard);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(getSession().status).toBe('authenticated');
    });
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]?.url).toBe('/auth/refresh');
  });
});

describe.each(GUARDS.slice(0, 2))('%s, for a guest', (_, guard) => {
  it('goes to sign-in, carrying the page asked for', async () => {
    await becomeAnonymous();

    const router = renderGuarded(guard, '/guarded?tab=2');

    expect(await screen.findByText('The sign-in page')).toBeInTheDocument();
    expect(where(router)).toBe('/login?next=%2Fguarded%3Ftab%3D2');
  });
});

describe('RequireAuth', () => {
  it('shows the page to a signed-in user', () => {
    signIn();

    renderGuarded(requireAuth);

    expect(screen.getByText('The guarded page')).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  it('shows the page to a user with the role', () => {
    signIn({ role: 'ADMIN' });

    renderGuarded(requireAdmin);

    expect(screen.getByText('The guarded page')).toBeInTheDocument();
  });

  it('shows the 403 state, without moving, to a user without the role', () => {
    signIn({ role: 'OWNER' });

    const router = renderGuarded(requireAdmin);

    expect(
      screen.getByRole('heading', { name: 'You don’t have access to this page' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('The guarded page')).not.toBeInTheDocument();
    expect(where(router)).toBe('/guarded');
  });
});

describe('RequireGuest', () => {
  it('shows the page to a guest', async () => {
    await becomeAnonymous();

    renderGuarded(requireGuest);

    expect(screen.getByText('The guarded page')).toBeInTheDocument();
  });

  it('sends a signed-in user on to the page in `next`', async () => {
    signIn();

    const router = renderGuarded(requireGuest, '/guarded?next=%2Fme%2Ffavorites');

    expect(await screen.findByText('The favourites page')).toBeInTheDocument();
    expect(where(router)).toBe('/me/favorites');
  });

  it('sends a signed-in user home when `next` would leave the site', async () => {
    signIn();

    const router = renderGuarded(requireGuest, '/guarded?next=%2F.%2F%2Fevil.example');

    expect(await screen.findByText('The home page')).toBeInTheDocument();
    expect(where(router)).toBe('/');
  });

  it('sends a signed-in user home when there is no `next`', async () => {
    signIn();

    const router = renderGuarded(requireGuest);

    expect(await screen.findByText('The home page')).toBeInTheDocument();
    expect(where(router)).toBe('/');
  });
});
