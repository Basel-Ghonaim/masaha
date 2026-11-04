import { createQueryClient } from '@shared/api';
import { establishSession, refreshSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { publicSpace } from '../../../test/publicSpace';
import { setSessionHint } from '../../../test/sessionHint';
import { startPreferences } from '../../../test/startPreferences';
import { warm } from '../../../test/warmLazy';
import { siteRoutes } from '../routes';

// The lazy modules its tests open, loaded once before any test waits (src/test/warmLazy.ts).
beforeAll(
  () =>
    warm(
      () => import('../shell/FocusLayout'),
      () => import('../shell/SiteLayout'),
      () => import('./SignInPage'),
      () => import('./RegisterPage'),
      () => import('./ForgotPasswordPage'),
      () => import('@features/users'),
      () => import('../public/about/AboutPage'),
      () => import('../public/directory/DirectoryPage'),
    ),
  60_000,
);

/** The site's routes, as the app mounts them, at `path`, over `client`; returns the router. */
function renderSite(path: string, client = createQueryClient()) {
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function where(router: ReturnType<typeof createMemoryRouter>) {
  const { pathname, search } = router.state.location;
  return `${pathname}${search}`;
}

async function becomeAnonymous() {
  setSessionHint(false);
  await restoreSession();
}

beforeEach(async () => {
  startPreferences('en');
  await becomeAnonymous();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe.each([
  ['/login', 'Sign in'],
  ['/register', 'Create account'],
])('%s', (path, title) => {
  it('shows its page to a guest, in the focus shell: the short header and no footer', async () => {
    renderSite(path);

    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'Masaha' })).toHaveAttribute('href', '/');
    expect(header.getByRole('button', { name: 'العربية' })).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'Dark theme' })).toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('sends a signed-in user on to the page they came for, under RequireGuest', async () => {
    establishSession(aSession(), { source: 'signIn' });

    const router = renderSite(`${path}?next=%2Fabout`);

    await waitFor(() => {
      expect(where(router)).toBe('/about');
    });
  });
});

describe('the sign-in page', () => {
  it('lands the user on the page they came for once signed in, through RequireGuest alone', async () => {
    fakeTransport(() => ok(aSession()));
    const router = renderSite('/login?next=%2Fspaces');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workspaces' }),
    ).toBeInTheDocument();
    expect(where(router)).toBe('/spaces');
  });

  it('moves the focus to the site’s main content once signed in, the sign-in button gone', async () => {
    fakeTransport(() => ok(aSession()));
    renderSite('/login?next=%2Fabout');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'About Masaha' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  it('lands an owner in their space’s overview, through RequireGuest, when no page asked for the sign-in', async () => {
    fakeTransport(() => ok(aSession({ role: 'OWNER', spaces: [{ spaceId: 7, role: 'OWNER' }] })));
    const router = renderSite('/login');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(where(router)).toBe('/dashboard/spaces/7');
    });
  });

  it('lands a user with no dashboard home, through RequireGuest, when no page asked for the sign-in', async () => {
    fakeTransport(() => ok(aSession()));
    const router = renderSite('/login');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(where(router)).toBe('/');
    });
  });

  it('says why the session ended, only after the server ended it for idleness', async () => {
    renderSite('/login');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.queryByText(/15 minutes with no activity/)).toBeNull();
  });

  it('says a session ended for idleness above the form', async () => {
    establishSession(aSession(), { source: 'signIn' });
    setSessionHint(true);
    fakeTransport(() => refused(401, { type: 'unauthorized', code: 'SESSION_IDLE' }));
    await refreshSession().catch(() => undefined);
    renderSite('/login?next=%2Fdashboard%2Fspaces%2F7%2Fdesk');

    const line = await screen.findByText(
      'Your session ended after 15 minutes with no activity. Sign in again.',
    );
    expect(line.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  it('links to a forgotten password and to a new account, each carrying the return page', async () => {
    renderSite('/login?next=%2Fabout');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password?next=%2Fabout',
    );
    expect(main.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register?next=%2Fabout',
    );
  });

  it('speaks to the people who sign in: the ones who save and report, and the ones who run a space', async () => {
    renderSite('/login');

    expect(
      await screen.findByText(
        'Sign in to save your favourite spaces and follow your reports, or to run your space.',
      ),
    ).toBeInTheDocument();
  });

  it('names the way back to the space next points to, from the directory’s cached read', async () => {
    const client = createQueryClient();
    // The directory's key of a space's page (features/directory's directoryKeys.space).
    client.setQueryData(['public', 'directory', 'space', 'noor-hub'], publicSpace());
    renderSite('/login?next=%2Fspaces%2Fnoor-hub', client);
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: /^Back to .Noor Hub.$/ })).toHaveAttribute(
      'href',
      '/spaces/noor-hub',
    );
  });

  it('goes back to the previous page when the read of the space next points to is not held', async () => {
    renderSite('/login?next=%2Fspaces%2Fnoor-hub');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Back to the previous page' })).toHaveAttribute(
      'href',
      '/spaces/noor-hub',
    );
  });

  it('goes back home without a return page, or with one that would leave the site', async () => {
    renderSite('/login?next=%2F%2Fevil.example');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(main.queryByRole('link', { name: /^Browse spaces/ })).not.toBeInTheDocument();
  });
});

describe('the register page', () => {
  it('lands the new account on the page it came for, through RequireGuest alone', async () => {
    fakeTransport(() => ok(aSession(), 201));
    const router = renderSite('/register?next=%2Fabout');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Name'), 'Sara');
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(where(router)).toBe('/about');
    });
  });

  it('offers the way back, as sign-in does', async () => {
    renderSite('/register?next=%2Fabout');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Back to the previous page' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('links to sign in carrying the return page, and space owners to the about page’s owners', async () => {
    renderSite('/register?next=%2Fabout');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fabout',
    );
    expect(
      main.getByText(
        'Run a coworking space? Space owner accounts are created by the Masaha team.',
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
    expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/about#owners');
  });

  it('offers the privacy policy in one small line', async () => {
    renderSite('/register');
    const main = within(await screen.findByRole('main'));

    const privacy = await main.findByRole('link', { name: 'privacy policy' });
    expect(privacy).toHaveAttribute('href', '/privacy');
    expect(privacy.closest('p')).toHaveTextContent(/^Read the privacy policy$/);
    expect(privacy.closest('p')).toHaveClass('text-caption');
  });

  it('offers to sign in with a taken email, carrying the return page', async () => {
    fakeTransport(() =>
      refused(409, { type: 'conflict', code: 'EMAIL_TAKEN', errors: { email: ['not_unique'] } }),
    );
    renderSite('/register?next=%2Fabout');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Name'), 'Sara');
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('link', { name: 'Sign in with this email' })).toHaveAttribute(
      'href',
      '/login?next=%2Fabout',
    );
  });
});
