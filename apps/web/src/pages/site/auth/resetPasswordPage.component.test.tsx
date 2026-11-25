import type { RecoveryPosition } from '@masaha/shared/auth';
import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASKED_EMAIL } from '../../../test/fakeRecovery';
import { aSession } from '../../../test/fakeSession';
import { publicSpace } from '../../../test/publicSpace';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { warm } from '../../../test/warmLazy';
import { siteRoutes } from '../routes';

// The lazy modules its tests open, loaded once before any test waits (src/test/warmLazy.ts).
beforeAll(
  () =>
    warm(
      () => import('../shell/FocusLayout'),
      () => import('./ResetPasswordPage'),
      () => import('../shell/SiteLayout'),
      () => import('../public/space/SpacePage'),
      () => import('../public/home/HomePage'),
      () => import('../public/about/AboutPage'),
    ),
  60_000,
);

const PASSWORD: RecoveryPosition = { step: 'password', email: MASKED_EMAIL };

// The requests the last rendered site sent, as the fake server received them.
let sent: { method?: string; url?: string }[] = [];

/** The site's routes, as the app mounts them, at `path`, in the browser's address and the router's. */
function renderSite(path: string, answer: Parameters<typeof fakeTransport>[0]) {
  window.history.replaceState(null, '', path);
  sent = fakeTransport(answer);
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/**
 * The server through a reset and the sign-in after it: the recovery at the new password, the
 * password set, the sign-in, and the site's reads for the page it lands on.
 */
function server(request: Request) {
  if (request.url === '/auth/password/recovery') return ok(PASSWORD);
  if (request.url === '/auth/password/reset') return { status: 204 };
  if (request.url === '/auth/login') return ok(aSession());
  if (request.url === '/spaces') return ok([], 200);
  if (request.url === '/lookups') return ok({ governorates: [], areas: [], amenities: [] });
  if (request.url?.endsWith('/occupancy')) return ok({ status: null });
  if (request.url === '/me/favorites') return ok([]);
  if (request.method === 'post') return { status: 204 };
  return ok(publicSpace());
}

/** Sets the new password, then signs in on the card with it. */
async function setThenSignIn() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('New password'), 'gaza2026x');
  await user.click(screen.getByRole('button', { name: 'Save password' }));
  await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
  await user.type(screen.getByLabelText('Password'), 'gaza2026x');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

/** A guest's favourite of «Noor Hub», held in this browser's storage by the tab it was pressed in. */
function holdFavoriteElsewhere(path = '/spaces/noor-hub') {
  localStorage.setItem(
    'masaha.heldIntent',
    JSON.stringify({
      kind: 'favorite',
      spaceId: 7,
      name: { text: 'Noor Hub' },
      path,
      at: Date.now(),
    }),
  );
}

beforeEach(async () => {
  startPreferences('en');
  setSessionHint(false);
  await restoreSession();
});

afterEach(async () => {
  restoreTransport();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  setSessionHint(false);
  await restoreSession();
});

describe('the reset password page', () => {
  it('opens a reset link for a guest, in the focus shell', async () => {
    renderSite('/reset-password#token=link-token', () => ok(PASSWORD));

    const main = within(await screen.findByRole('main'));
    expect(await main.findByLabelText('New password')).toBeInTheDocument();
    expect(main.getByRole('heading', { level: 1, name: 'Set a new password' })).toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('opens a reset link for a signed-in user too: it has no guest guard', async () => {
    establishSession(aSession(), { source: 'signIn' });

    const router = renderSite('/reset-password#token=link-token', () => ok(PASSWORD));

    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/reset-password');
  });

  it('links to a new link when this one can no longer be used', async () => {
    renderSite('/reset-password#token=used', () =>
      refused(400, { type: 'bad_request', code: 'RESET_TOKEN_INVALID' }),
    );

    expect(await screen.findByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('offers the sign-in on the card once the password is set, the email to type and focused, the way back gone', async () => {
    renderSite('/reset-password', (config) =>
      config.method === 'get' ? ok(PASSWORD) : { status: 204 },
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    const email = await screen.findByLabelText('Email');
    expect(email).toHaveValue('');
    expect(email).toHaveAttribute('autocomplete', 'email');
    await waitFor(() => {
      expect(email).toHaveFocus();
    });
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    expect(screen.queryByRole('link', { name: 'Back to sign in' })).not.toBeInTheDocument();
  });

  it('carries the return page to sign in before the password is set, and lands on it after', async () => {
    const router = renderSite('/reset-password?next=%2Fabout#token=link-token', server);
    const main = within(await screen.findByRole('main'));

    await main.findByLabelText('New password');
    expect(main.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fabout',
    );
    await setThenSignIn();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/about');
    });
  });

  it('lands by role after the sign-in on the card when nothing is held and no page was asked for', async () => {
    const router = renderSite('/reset-password', server);

    await setThenSignIn();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('says where it returns while a guest’s action is held, and lands there once signed in', async () => {
    holdFavoriteElsewhere();
    const router = renderSite('/reset-password', server);

    expect(
      await screen.findByText(
        /After saving, sign in here and we take you back to .Noor Hub. to finish saving it to your favourites\./,
      ),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));
    expect(
      await screen.findByText(
        /Sign in with your new password, and we take you back to .Noor Hub. to finish saving it\./,
      ),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/spaces/noor-hub');
    });
    // The action completes there, once.
    await waitFor(() => {
      expect(
        sent.filter(({ method, url }) => method === 'post' && url === '/me/favorites/7'),
      ).toHaveLength(1);
    });
  });

  it('promises the return only while the action is still held once the password is set', async () => {
    holdFavoriteElsewhere();
    renderSite('/reset-password', server);
    await screen.findByText(/we take you back to .Noor Hub./);

    // The waiting tab's overlay closed meanwhile, letting the action go.
    localStorage.removeItem('masaha.heldIntent');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByText('Sign in with your new password.')).toBeInTheDocument();
    expect(screen.queryByText(/we take you back to/)).toBeNull();
  });

  it('never follows a held action’s page that leaves the site', async () => {
    holdFavoriteElsewhere('/\\evil.example');
    const router = renderSite('/reset-password', server);

    await screen.findByLabelText('New password');
    expect(screen.queryByText(/we take you back to/)).toBeNull();
    await setThenSignIn();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('keeps the link to sign in when a session is still held once the password is set', async () => {
    establishSession(aSession(), { source: 'signIn' });
    renderSite('/reset-password', (request) =>
      request.url === '/auth/refresh' ? ok(aSession()) : server(request),
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('carries the return page to a new link when this one can no longer be used', async () => {
    renderSite('/reset-password?next=%2Fabout#token=used', () =>
      refused(400, { type: 'bad_request', code: 'RESET_TOKEN_INVALID' }),
    );

    expect(await screen.findByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password?next=%2Fabout',
    );
  });

  it('marks the recovery done once the password is set, and not before', async () => {
    localStorage.removeItem('masaha.recoveredAt');
    renderSite('/reset-password', (config) =>
      config.method === 'get' ? ok(PASSWORD) : { status: 204 },
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('New password'), 'gaza2026x');
    expect(localStorage.getItem('masaha.recoveredAt')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    await screen.findByLabelText('Email');
    // The sign-in after it is the recovery's round trip: a guest's held action may run (168).
    expect(Number(localStorage.getItem('masaha.recoveredAt'))).toBeGreaterThan(0);
    localStorage.removeItem('masaha.recoveredAt');
  });

  it('offers the way back to sign in until the password is set', async () => {
    renderSite('/reset-password#token=link-token', () => ok(PASSWORD));
    const main = within(await screen.findByRole('main'));

    await main.findByLabelText('New password');
    expect(main.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });

  it('offers the way back to sign in beside a new link when this one can no longer be used', async () => {
    renderSite('/reset-password#token=used', () =>
      refused(400, { type: 'bad_request', code: 'RESET_TOKEN_INVALID' }),
    );

    await screen.findByRole('link', { name: 'Request a new link' });
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });
});
