import { screen, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { AccountMenu } from './AccountMenu';

const USER = aSession({ name: 'Sara Ahmad', email: 'sara@example.com' }).user;

/** The menu for `user`, inside a router, since its way into the dashboard is a link. */
function renderMenu(user = USER) {
  render(
    <MemoryRouter>
      <AccountMenu user={user} dashboardPath="/dashboard" />
    </MemoryRouter>,
  );
}

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) =>
  name.replace(/[\u2066-\u2069]/g, '') === expected;

/** Renders the menu and opens it; returns the open menu. */
async function openMenu(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  fakeTransport(answer);
  renderMenu();
  await userEvent.click(screen.getByRole('button', { name: heard('Account menu: Sara Ahmad') }));
  return within(await screen.findByRole('menu'));
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AccountMenu', () => {
  it('shows the avatar initial and the first name in a button named for the account', () => {
    renderMenu();

    expect(
      screen.getByRole('button', { name: heard('Account menu: Sara Ahmad') }),
    ).toHaveTextContent(/^SSara$/);
  });

  it('lists the name, the email left to right, and sign-out', async () => {
    const menu = await openMenu(() => ({ status: 204 }));

    expect(menu.getByText('Sara Ahmad')).toBeInTheDocument();
    expect(menu.getByText('sara@example.com')).toHaveAttribute('dir', 'ltr');
    expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('leads a user with a space to the dashboard, listed before sign-out', async () => {
    renderMenu({ ...USER, spaces: [{ spaceId: 7, role: 'RECEPTION' }] });
    await userEvent.click(screen.getByRole('button', { name: heard('Account menu: Sara Ahmad') }));

    const items = within(await screen.findByRole('menu')).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Dashboard', 'Sign out']);
    expect(items[0]).toHaveAttribute('href', '/dashboard');
  });

  it('disables sign-out, and keeps the menu open, while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    const menu = await openMenu(() => answer.promise);

    await userEvent.click(menu.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => {
      expect(menu.getByRole('menuitem', { name: 'Sign out' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    answer.resolve({ status: 204 });
  });

  it('shows why the sign-out failed inside the menu', async () => {
    const menu = await openMenu(() => ({ failure: 'ERR_NETWORK' }));

    await userEvent.click(menu.getByRole('menuitem', { name: 'Sign out' }));

    const alert = await menu.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t sign out');
    expect(alert).toHaveTextContent('No connection. Check your internet and try again.');
  });
});
