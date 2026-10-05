import { apiClient } from '@shared/api';
import { establishSession, getSession, restoreSession, type SessionUser } from '@shared/session';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok } from '../../../test/fakeTransport';
import { setSessionHint } from '../../../test/sessionHint';
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

/** A guarded page at /guarded, beside sign-in, home and the dashboard, opened at `path`. */
function renderGuarded(guard: Guard, path = '/guarded') {
  const router = createMemoryRouter(
    [
      { path: '/guarded', element: guard(<p>The guarded page</p>) },
      { path: '/login', element: <p>The sign-in page</p> },
      { path: '/', element: <p>The home page</p> },
      { path: '/me/favorites', element: <p>The favourites page</p> },
      { path: '/dashboard/*', element: <p>The dashboard</p> },
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
  setSessionHint(false);
  await restoreSession();
}

/** A restore whose refresh gets `answer`, which is no verdict on the session. */
async function becomeUnreachable(answer: FakeAnswer) {
  setSessionHint(true);
  fakeTransport(() => answer);
  await restoreSession();
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
    const answer = deferred<FakeAnswer>();
    setSessionHint(true);
    fakeTransport(() => answer.promise);
    const restoring = restoreSession();

    renderGuarded(guard);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('The guarded page')).not.toBeInTheDocument();
    await act(async () => {
      answer.resolve(ok(aSession({ role: 'ADMIN' })));
      await restoring;
    });
  });

  it('shows offline when no answer came back, and Try again re-runs the restore', async () => {
    const user = userEvent.setup();
    await becomeUnreachable({ failure: 'ERR_NETWORK' });
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
    await becomeUnreachable({ status: 503 });
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

  it('sends a signed-in user with no role and no space home when there is no `next`', async () => {
    signIn();

    const router = renderGuarded(requireGuest);

    expect(await screen.findByText('The home page')).toBeInTheDocument();
    expect(where(router)).toBe('/');
  });

  it.each([
    ['the admin to the admin’s overview', { role: 'ADMIN' as const }, '/dashboard/admin'],
    [
      'an owner to their space’s overview',
      { role: 'OWNER' as const, spaces: [{ spaceId: 7, role: 'OWNER' as const }] },
      '/dashboard/spaces/7',
    ],
    [
      'reception to their space’s front desk',
      { spaces: [{ spaceId: 7, role: 'RECEPTION' as const }] },
      '/dashboard/spaces/7/desk',
    ],
  ])('lands %s when there is no `next`', async (_, user, landing) => {
    signIn(user);

    const router = renderGuarded(requireGuest);

    expect(await screen.findByText('The dashboard')).toBeInTheDocument();
    expect(where(router)).toBe(landing);
  });

  it('sends the admin on to a safe `next` rather than their dashboard', async () => {
    signIn({ role: 'ADMIN' });

    const router = renderGuarded(requireGuest, '/guarded?next=%2Fme%2Ffavorites');

    expect(await screen.findByText('The favourites page')).toBeInTheDocument();
    expect(where(router)).toBe('/me/favorites');
  });

  it('lands the admin in their dashboard when `next` would leave the site', async () => {
    signIn({ role: 'ADMIN' });

    const router = renderGuarded(requireGuest, '/guarded?next=%2F%2Fevil.example');

    expect(await screen.findByText('The dashboard')).toBeInTheDocument();
    expect(where(router)).toBe('/dashboard/admin');
  });
});
