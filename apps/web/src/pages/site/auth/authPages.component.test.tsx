import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { setSessionHint } from '../../../test/sessionHint';
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

    expect(await screen.findByRole('heading', { level: 1, name: 'Spaces' })).toBeInTheDocument();
    expect(where(router)).toBe('/spaces');
  });

  it('lands the user home, through RequireGuest, when no page asked for the sign-in', async () => {
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

  it('links to a forgotten password, to a new account carrying the return page, and to the spaces', async () => {
    renderSite('/login?next=%2Fabout');
    const main = within(await screen.findByRole('main'));

    expect(await main.findByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(main.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register?next=%2Fabout',
    );
    expect(main.getByRole('link', { name: 'Browse spaces without an account' })).toHaveAttribute(
      'href',
      '/spaces',
    );
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

  it('links to sign in carrying the return page, and to contact for space owners', async () => {
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
    expect(main.getByRole('link', { name: 'Contact us' })).toHaveAttribute(
      'href',
      '/about#contact',
    );
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
