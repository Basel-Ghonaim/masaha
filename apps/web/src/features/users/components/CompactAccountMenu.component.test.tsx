import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SessionUser } from '@shared/session';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { CompactAccountMenu } from './CompactAccountMenu';

const USER = aSession({ name: 'Sara Ahmad', email: 'sara@example.com' }).user;

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

function renderMenu(user: SessionUser) {
  render(
    <MemoryRouter>
      <CompactAccountMenu user={user} dashboardPath="/dashboard" />
    </MemoryRouter>,
  );
  return screen.getByRole('button', { name: heard('Account menu: Sara Ahmad') });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('CompactAccountMenu', () => {
  it('shows the avatar initial alone, in a button named for the account', () => {
    expect(renderMenu(USER)).toHaveTextContent(/^S$/);
  });

  it('opens the account menu: the name, the email and sign-out', async () => {
    await userEvent.click(renderMenu(USER));

    const menu = within(await screen.findByRole('menu'));
    expect(menu.getByText('Sara Ahmad')).toBeInTheDocument();
    expect(menu.getByText('sara@example.com')).toHaveAttribute('dir', 'ltr');
    expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('leads a user with a space to the dashboard path it is given', async () => {
    await userEvent.click(renderMenu({ ...USER, spaces: [{ spaceId: 7, role: 'OWNER' }] }));

    const menu = within(await screen.findByRole('menu'));
    expect(menu.getByRole('menuitem', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('leads the admin to the dashboard', async () => {
    await userEvent.click(renderMenu({ ...USER, role: 'ADMIN' }));

    expect(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Dashboard' }),
    ).toBeInTheDocument();
  });

  it('offers no dashboard to a user with no role and no space', async () => {
    await userEvent.click(renderMenu(USER));

    expect(
      within(await screen.findByRole('menu')).queryByRole('menuitem', { name: 'Dashboard' }),
    ).not.toBeInTheDocument();
  });
});
