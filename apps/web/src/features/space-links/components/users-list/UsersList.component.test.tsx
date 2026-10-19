import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { UsersList } from './UsersList';

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

/** The signed-in admin (id 1), with a password and Google. */
const SARA = user({ id: 1, name: 'Sara', role: 'ADMIN', signIn: { password: true, google: true } });
/** An owner of Focus Hub. */
const HADI = user({
  id: 3,
  name: 'Hadi',
  role: 'OWNER',
  spaces: [{ id: 7, nameEn: 'Focus Hub', nameAr: null }],
});
/** A suspended user, with Google only, who works Palm Hub's front desk. */
const NOUR = user({
  id: 8,
  name: 'Nour',
  isSuspended: true,
  signIn: { password: false, google: true },
  receptionSpaces: [{ id: 9, nameEn: 'Palm Hub', nameAr: null }],
});

/** A page of `rows`, the only one. */
function page(rows: AdminUserRow[]): FakeAnswer {
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

/** The users list at `path`, each row's actions a button the page would give; `rows` answers it. */
function renderList(path = '/users', rows: () => AdminUserRow[] = () => [SARA, HADI, NOUR]) {
  const requests = fakeTransport(() => page(rows()));
  const actions = vi.fn((row: AdminUserRow) => (
    <button type="button">{`Actions for ${row.name}`}</button>
  ));
  const router = createMemoryRouter(
    [
      {
        path: '/users',
        element: (
          <main>
            <UsersList actions={actions} deletedSpacesLink="/spaces?status=deleted" />
          </main>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const client = createQueryClient();
  const rendered = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, requests, router, actions, client };
}

/** A row's cells; `[]` when the row is not there. */
const cellsOf = (row: HTMLElement | undefined) =>
  row
    ? within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    : [];

/** The joining date, the year left to the day the test runs. */
const JOINED: unknown = expect.stringMatching(/^1 Sept/);

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ id: 1, role: 'ADMIN' }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('UsersList, from 1024 px', () => {
  beforeEach(() => {
    stubScreenWidth(1280);
  });

  it('shows each person’s role, sign-in, joined date, spaces, reception desks and state', async () => {
    renderList();

    const table = await screen.findByRole('table', { name: 'Users' });
    await within(table).findByText('Hadi');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Name', 'Email', 'Role', 'Sign-in', 'Joined', 'Spaces', 'Status', 'Actions']);
    const [, sara, hadi, nour] = within(table).getAllByRole('row');
    expect(cellsOf(sara)).toEqual([
      'Sara',
      'sara@example.com',
      'Admin',
      'Password and Google',
      JOINED,
      '—No spaces',
      'Active',
      'You',
    ]);
    expect(cellsOf(hadi)).toEqual([
      'Hadi',
      'hadi@example.com',
      'Owner',
      'Password',
      JOINED,
      'OwnerFocus Hub',
      'Active',
      'Actions for Hadi',
    ]);
    expect(cellsOf(nour)).toEqual([
      'Nour',
      'nour@example.com',
      'User',
      'Google',
      JOINED,
      'Front deskPalm Hub',
      'Suspended',
      'Actions for Nour',
    ]);
    expect(within(table).getByText('nour@example.com')).toHaveAttribute('dir', 'ltr');
  });

  it('reads an owner whose every space is deleted as finding 50’s line, a link to the deleted spaces', async () => {
    const omar = user({ id: 9, name: 'Omar', role: 'OWNER' });
    renderList('/users', () => [omar]);

    const row = await screen.findByRole('row', { name: /Omar/ });
    const line = within(row).getByRole('link', {
      name: 'All their spaces are deleted — restore the space to unlink them',
    });
    expect(line).toHaveAttribute('href', '/spaces?status=deleted');
    expect(within(row).getByText('Owner', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows «You» in place of the actions on the admin’s own row', async () => {
    const { actions } = renderList();

    await screen.findByText('Hadi');
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions for Sara' })).not.toBeInTheDocument();
    expect(actions.mock.calls.map(([row]) => row.id)).not.toContain(1);
  });

  it('filters by role and by state from the chips', async () => {
    const { router, requests } = renderList();
    await screen.findByText('Hadi');

    const roles = screen.getByRole('radiogroup', { name: 'Role' });
    expect(within(roles).getByRole('radio', { name: 'All' })).toBeChecked();
    await userEvent.click(within(roles).getByRole('radio', { name: 'Admin' }));
    expect(router.state.location.search).toBe('?role=admin');

    const states = screen.getByRole('radiogroup', { name: 'Status' });
    await userEvent.click(within(states).getByRole('radio', { name: 'Suspended' }));
    expect(router.state.location.search).toBe('?role=admin&state=suspended');

    await waitFor(() => {
      expect(requests.at(-1)?.params).toEqual({ role: 'admin', state: 'suspended', page: 1 });
    });
  });

  it('keeps each row, its actions included, when the list is fetched again with a change', async () => {
    // After an action, the admin's views arrive again with it: here Nour is restored.
    let rows = [SARA, HADI, NOUR];
    const { client } = renderList('/users', () => rows);
    const before = await screen.findByRole('button', { name: 'Actions for Hadi' });

    rows = [SARA, HADI, { ...NOUR, isSuspended: false }];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['admin'] });
    });
    await waitFor(() => {
      expect(screen.getByRole('row', { name: /Nour/ })).toHaveTextContent('Active');
    });

    // The same element: the row was drawn again, not rebuilt, so a dialog or the focus in it stays.
    expect(screen.getByRole('button', { name: 'Actions for Hadi' })).toBe(before);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderList();
    await screen.findByText('Hadi');

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('UsersList, below 1024 px', () => {
  it('keeps a card per person until 1024 px', async () => {
    stubScreenWidth(768);
    renderList();
    await screen.findByText('Hadi');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: 'Users' })).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    const [sara, hadi] = cards as [HTMLElement, HTMLElement, HTMLElement];
    expect(within(hadi).getByText(/^Owner · Password · 1 Sept/)).toBeInTheDocument();
    expect(within(hadi).getByText('Focus Hub')).toBeInTheDocument();
    expect(within(hadi).getByRole('button', { name: 'Actions for Hadi' })).toBeInTheDocument();
    expect(within(sara).getByText('You')).toBeInTheDocument();
  });
});
