import type { RecoveryPosition } from '@masaha/shared/auth';
import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASKED_EMAIL } from '../../../test/fakeRecovery';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { siteRoutes } from '../routes';

const PASSWORD: RecoveryPosition = { step: 'password', email: MASKED_EMAIL };

/** The site's routes, as the app mounts them, at `path`, in the browser's address and the router's. */
function renderSite(path: string, answer: Parameters<typeof fakeTransport>[0]) {
  window.history.replaceState(null, '', path);
  fakeTransport(answer);
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

beforeEach(async () => {
  startPreferences('en');
  setSessionHint(false);
  await restoreSession();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
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

  it('links to sign in once the password is set', async () => {
    renderSite('/reset-password', (config) =>
      config.method === 'get' ? ok(PASSWORD) : { status: 204 },
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});
