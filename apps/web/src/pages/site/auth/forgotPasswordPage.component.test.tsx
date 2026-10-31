import type { RecoveryPosition } from '@masaha/shared/auth';
import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASKED_EMAIL } from '../../../test/fakeRecovery';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { siteRoutes } from '../routes';

/**
 * The site's routes, as the app mounts them, at `path`, the recovery at `position`, and the
 * platform's public contact `contact` (none set by default).
 */
function renderSite(
  path: string,
  position: RecoveryPosition = { step: 'request' },
  contact: object = { email: null, whatsapp: null },
) {
  fakeTransport((request) => ok(request.url === '/settings/public' ? contact : position));
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
});

describe('the forgot password page', () => {
  it('shows the recovery to a guest, in the focus shell', async () => {
    renderSite('/forgot-password');

    const main = within(await screen.findByRole('main'));
    expect(await main.findByLabelText('Email')).toBeInTheDocument();
    expect(main.getByRole('heading', { level: 1, name: 'Forgot password' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('sends a signed-in user on, under RequireGuest', async () => {
    establishSession(aSession(), { source: 'signIn' });

    const router = renderSite('/forgot-password?next=%2Fabout');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/about');
    });
  });

  it('links back to sign in, and to the contact', async () => {
    renderSite('/forgot-password');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/about#contact',
    );
  });

  it('opens the platform’s WhatsApp for someone who cannot reach their email, when it is set', async () => {
    renderSite('/forgot-password', { step: 'request' }, { email: null, whatsapp: '+970599000000' });
    const main = within(await screen.findByRole('main'));

    await waitFor(() => {
      expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
        'href',
        'https://wa.me/970599000000',
      );
    });
    expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute('target', '_blank');
  });

  it('carries the return page back to sign in', async () => {
    renderSite('/forgot-password?next=%2Fspaces%2Fnoor-hub');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fspaces%2Fnoor-hub',
    );
  });

  it('links on to the new password once a link is open in this browser', async () => {
    renderSite('/forgot-password', { step: 'password', email: MASKED_EMAIL });

    expect(await screen.findByRole('link', { name: 'Set a new password' })).toHaveAttribute(
      'href',
      '/reset-password',
    );
  });
});
