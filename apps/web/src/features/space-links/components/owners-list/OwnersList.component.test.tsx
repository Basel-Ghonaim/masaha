import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { OwnersList } from './OwnersList';

const RIMA: AdminUserRow = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  role: 'OWNER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [
    { id: 7, nameEn: 'Focus Hub', nameAr: null },
    { id: 9, nameEn: 'Palm Hub', nameAr: 'بالم' },
  ],
};
const SAMI: AdminUserRow = {
  id: 6,
  name: 'Sami',
  email: 'sami@example.com',
  role: 'OWNER',
  isSuspended: true,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-02T08:00:00Z',
  // Every one of his spaces is deleted: the list leaves them out.
  spaces: [],
};

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

/** The owners list at `path`, the server answering with `answer`. */
function renderList(
  path = '/owners',
  answer: Parameters<typeof fakeTransport>[0] = () => page([RIMA, SAMI]),
) {
  const requests = fakeTransport(answer);
  const router = createMemoryRouter(
    [
      {
        path: '/owners',
        element: (
          <main>
            <OwnersList deletedSpacesLink="/spaces?status=deleted" />
          </main>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const rendered = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, requests, router };
}

/** A row's cells; `[]` when the row is not there. */
const cellsOf = (row: HTMLElement | undefined) =>
  row
    ? within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    : [];

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('OwnersList, from 1024 px', () => {
  beforeEach(() => {
    stubScreenWidth(1280);
  });

  it('shows each owner with their email, their spaces and their state', async () => {
    renderList();

    const table = await screen.findByRole('table', { name: 'Space owners' });
    await within(table).findByText('Rima');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Name', 'Email', 'Linked spaces', 'Status']);
    const [, rima] = within(table).getAllByRole('row');
    // The email under the name is hidden from 1024 px, where it has its own column.
    expect(cellsOf(rima)).toEqual([
      'Rimarima@example.com',
      'rima@example.com',
      'Focus HubPalm Hub',
      'Active',
    ]);
    expect(screen.getByText('Space owners: 2')).toBeVisible();
  });

  it('leads an owner whose spaces are all deleted to the deleted spaces', async () => {
    renderList();

    const line = await screen.findByRole('link', {
      name: 'All their spaces are deleted — restore the space to unlink them',
    });
    expect(line).toHaveAttribute('href', '/spaces?status=deleted');
    const [, , sami] = within(screen.getByRole('table')).getAllByRole('row');
    expect(cellsOf(sami)[3]).toBe('Suspended');
  });

  it('filters by state from the chips', async () => {
    const { requests, router } = renderList();
    await screen.findByText('Rima');

    const chips = screen.getByRole('radiogroup', { name: 'Status' });
    expect(within(chips).getByRole('radio', { name: 'All' })).toBeChecked();
    await userEvent.click(within(chips).getByRole('radio', { name: 'Suspended' }));

    expect(router.state.location.search).toBe('?state=suspended');
    await waitFor(() => {
      expect(requests.at(-1)?.params).toEqual({ state: 'suspended', page: 1, role: 'owner' });
    });
    // The chip already on stays on when clicked again.
    await userEvent.click(within(chips).getByRole('radio', { name: 'Suspended' }));
    expect(router.state.location.search).toBe('?state=suspended');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderList();
    await screen.findByText('Rima');

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('OwnersList, on a phone', () => {
  beforeEach(() => {
    stubScreenWidth(390);
  });

  it('shows each owner as a card with the same facts', async () => {
    renderList();
    await screen.findByText('Rima');

    const cards = within(screen.getByRole('list', { name: 'Space owners' })).getAllByRole(
      'listitem',
    );
    expect(cards.map((card) => card.textContent)).toEqual([
      'Rimarima@example.comActiveFocus HubPalm Hub',
      'Samisami@example.comSuspendedAll their spaces are deleted — restore the space to unlink them',
    ]);
  });
});
