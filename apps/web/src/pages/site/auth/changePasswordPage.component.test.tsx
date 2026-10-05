import { createQueryClient } from '@shared/api';
import { establishSession, getSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { siteRoutes } from '../routes';

/** The site's routes, as the app mounts them, at `path`; returns the router. */
function renderSite(path: string) {
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

function where(router: ReturnType<typeof createMemoryRouter>) {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}

async function saveNewPassword() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('New password'), 'mine2026x');
  await user.click(screen.getByRole('button', { name: 'Save and continue' }));
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ mustChangePassword: true }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the change password page', () => {
  it('shows the change in the focus shell, whose short header offers only the wordmark and sign-out', async () => {
    renderSite('/change-password');

    const main = await screen.findByRole('main');
    expect(
      await within(main).findByRole('heading', { level: 1, name: 'Choose a new password' }),
    ).toBeInTheDocument();
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'Masaha' })).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'العربية' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('lands the user on the page they asked for once the password is saved', async () => {
    fakeTransport(() => ok({ accessToken: 'token-renewed' }));
    const router = renderSite('/change-password?next=%2Fspaces');

    await saveNewPassword();

    expect(await screen.findByRole('heading', { level: 1, name: 'Spaces' })).toBeInTheDocument();
    expect(where(router)).toBe('/spaces');
  });

  it('lands a user with no role and no links home when no page was asked for', async () => {
    fakeTransport(() => ok({ accessToken: 'token-renewed' }));
    const router = renderSite('/change-password');

    await saveNewPassword();

    await waitFor(() => {
      expect(where(router)).toBe('/');
    });
  });

  it('signs out from the header, and then sends the guest to sign-in', async () => {
    fakeTransport(() => ({ status: 204 }));
    const router = renderSite('/change-password');

    await userEvent.click(
      within(await screen.findByRole('banner')).getByRole('button', { name: 'Sign out' }),
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(where(router)).toBe('/login');
    expect(getSession().status).toBe('anonymous');
  });
});
