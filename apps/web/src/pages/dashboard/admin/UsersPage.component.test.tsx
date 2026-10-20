import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow, AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { UsersPage } from './UsersPage';

const user = (row: Partial<AdminUserRow> & Pick<AdminUserRow, 'id' | 'name'>): AdminUserRow => ({
  email: `${row.name.toLowerCase()}@example.com`,
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
  ...row,
});

const NOUR = user({ id: 8, name: 'Nour' });
const SARA = user({ id: 2, name: 'Sara', role: 'ADMIN' });
const HADI = user({
  id: 3,
  name: 'Hadi',
  role: 'OWNER',
  spaces: [{ id: 7, nameEn: 'Focus Hub', nameAr: null }],
});

const FOCUS: AdminSpaceRow = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  isHidden: false,
  deletedAt: null,
  owners: [{ id: 6, name: 'Sami' }],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00.000Z',
};

/** A page of `rows`, the only one. */
function page(rows: unknown[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

// The screen's width, which a test can change while the page is open: the layout follows it live.
let screenWidth = 1280;
const widthListeners = new Set<() => void>();

function stubScreen() {
  vi.stubGlobal('matchMedia', (query: string) => {
    const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query);
    return {
      matches: minWidth !== null && screenWidth >= Number(minWidth[1]),
      media: query,
      addEventListener: (_type: string, listener: () => void) => {
        widthListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        widthListeners.delete(listener);
      },
    };
  });
}

function resize(width: number) {
  screenWidth = width;
  act(() => {
    for (const listener of widthListeners) listener();
  });
}

/** The users page; the server answers the users list with `rows`, and the spaces with Focus Hub. */
function renderPage(rows: () => AdminUserRow[] = () => [NOUR, HADI, SARA]) {
  fakeTransport((request) => (request.url === '/admin/users' ? page(rows()) : page([FOCUS])));
  const client = createQueryClient();
  const router = createMemoryRouter([{ path: '/users', element: <UsersPage /> }], {
    initialEntries: ['/users'],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client };
}

/** The menu button of the person `name`, as it is now. */
const triggerOf = (name: string) => screen.getByRole('button', { name: heard(`Actions: ${name}`) });

/** Opens `name`'s menu and chooses `item`. */
async function choose(name: string, item: string | RegExp) {
  await userEvent.click(await screen.findByRole('button', { name: heard(`Actions: ${name}`) }));
  await userEvent.click(await screen.findByRole('menuitem', { name: item }));
}

beforeEach(() => {
  startPreferences('en');
  screenWidth = 1280;
  widthListeners.clear();
  stubScreen();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('UsersPage', () => {
  it('opens the link dialog from a row’s menu, and returns the focus to the menu', async () => {
    renderPage();

    await choose('Nour', 'Link to a space');

    const dialog = await screen.findByRole('dialog', { name: heard('Link Nour to a space') });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(triggerOf('Nour')).toHaveFocus();
  });

  it('holds the link for an admin, saying why', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: heard('Actions: Sara') }));

    const link = await screen.findByRole('menuitem', { name: /Link to a space/ });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(within(link).getByText('An admin’s account — never linked to a space')).toBeVisible();
  });

  it('puts the role change first, with its lead when held', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: heard('Actions: Hadi') }));

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Change roleTheir role follows their links — unlink them first',
      'Unlink them',
      'Link to a space',
      'Suspend',
    ]);
    expect(items[0]).toHaveAttribute('aria-disabled', 'true');
    expect(items[1]).toHaveAttribute('href', '/dashboard/admin/owners?q=hadi%40example.com');
  });

  it('says nothing of spaces staying verified when suspending an owner whose every space is deleted', async () => {
    renderPage(() => [user({ id: 9, name: 'Omar', role: 'OWNER' }), HADI]);

    await choose('Omar', 'Suspend');
    const omar = await screen.findByRole('alertdialog', { name: heard('Suspend Omar?') });
    expect(omar).toHaveAccessibleDescription(
      'All their sessions end at once, and they can’t sign in until you restore the account.',
    );
    await userEvent.click(within(omar).getByRole('button', { name: 'Back' }));

    await choose('Hadi', 'Suspend');
    expect(
      await screen.findByRole('alertdialog', { name: heard('Suspend Hadi?') }),
    ).toHaveAccessibleDescription(/Their spaces stay verified/);
  });

  it('keeps an open dialog through a refresh that changes the list, and returns the focus to the row’s menu', async () => {
    let rows = [NOUR, HADI, SARA];
    const { client } = renderPage(() => rows);
    await choose('Nour', 'Link to a space');
    await screen.findByRole('dialog', { name: heard('Link Nour to a space') });

    // Another admin's change arrives with the admin's views: Hadi is suspended meanwhile.
    rows = [NOUR, { ...HADI, isSuspended: true }, SARA];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['admin'] });
    });
    await waitFor(() => {
      // The open dialog hides the page from the accessibility tree.
      expect(screen.getByRole('row', { name: /Hadi/, hidden: true })).toHaveTextContent(
        'Suspended',
      );
    });

    const dialog = screen.getByRole('dialog', { name: heard('Link Nour to a space') });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(triggerOf('Nour')).toHaveFocus();
  });

  it('keeps an open dialog through the switch from cards to the table, and returns the focus to the row’s menu', async () => {
    screenWidth = 768;
    renderPage();
    await choose('Nour', 'Link to a space');
    await screen.findByRole('dialog', { name: heard('Link Nour to a space') });

    resize(1280);
    await screen.findByRole('table', { name: 'Users' });

    const dialog = screen.getByRole('dialog', { name: heard('Link Nour to a space') });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(triggerOf('Nour')).toHaveFocus();
  });
});
