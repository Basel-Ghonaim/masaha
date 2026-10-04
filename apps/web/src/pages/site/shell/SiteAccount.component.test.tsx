import { createQueryClient } from '@shared/api';
import { establishSession, restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, fakeSessionRepository, fakeHint } from '../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { siteRoutes } from '../routes';

/** The site's routes, as the app mounts them, at `path`. */
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

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) =>
  name.replace(/[\u2066-\u2069]/g, '') === expected;

function signIn() {
  establishSession(aSession({ name: 'Sara Ahmad', email: 'sara@example.com' }), {
    source: 'signIn',
  });
}

/** The desktop header's account button, once a page with the site header has loaded. */
async function accountButton() {
  let button: HTMLElement | undefined;
  await waitFor(() => {
    button = within(screen.getByRole('banner')).getByRole('button', {
      name: heard('Account menu: Sara Ahmad'),
    });
  });
  if (!button) throw new Error('The header shows no account.');
  return button;
}

const NO_CONTENT: FakeAnswer = { status: 204 };

beforeEach(async () => {
  startPreferences('en');
  await restoreSession({ repository: fakeSessionRepository(), hint: fakeHint(false) });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe("the header's account", () => {
  it('shows sign-in to a guest, and no account', async () => {
    renderSite('/');
    const header = within(await screen.findByRole('banner'));

    expect(await header.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(header.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument();
  });

  it('shows the account in place of sign-in once the user signs in', async () => {
    fakeTransport(() => ok(aSession({ name: 'Sara Ahmad' })));
    renderSite('/login');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'gaza2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await accountButton()).toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
  });

  it('shows sign-in again in place of the account once the user signs out', async () => {
    signIn();
    fakeTransport(() => NO_CONTENT);
    renderSite('/');
    const user = userEvent.setup();

    await user.click(await accountButton());
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => {
      expect(
        within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' }),
      ).toBeInTheDocument();
    });
  });
});

describe("the phone menu's account", () => {
  it('shows the account section in place of sign-in, and sign-in again once signed out', async () => {
    signIn();
    fakeTransport(() => NO_CONTENT);
    renderSite('/');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Menu' }));
    const sheet = within(screen.getByRole('dialog', { name: 'Menu' }));
    const account = within(sheet.getByRole('group', { name: 'Account' }));
    expect(sheet.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();

    await user.click(account.getByRole('button', { name: 'Sign out' }));

    expect(await sheet.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(sheet.queryByRole('group', { name: 'Account' })).not.toBeInTheDocument();
  });
});
