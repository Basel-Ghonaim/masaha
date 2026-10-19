import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow, AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import type { LinkTarget } from '../../types/LinkTarget';
import { LinkOwnerDialog } from './LinkOwnerDialog';

const person = (row: Partial<AdminUserRow> & Pick<AdminUserRow, 'id' | 'name'>): AdminUserRow => ({
  email: `${row.name.toLowerCase()}@example.com`,
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
  ...row,
});

const space = (
  row: Partial<AdminSpaceRow> & Pick<AdminSpaceRow, 'id' | 'nameEn'>,
): AdminSpaceRow => ({
  slug: row.nameEn.toLowerCase().replace(' ', '-'),
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: false,
  isHidden: false,
  deletedAt: null,
  owners: [],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00.000Z',
  ...row,
});

/** A page of `rows`, the only one. */
function page(rows: unknown[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 50,
    totalPages: rows.length > 0 ? 1 : 0,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The dialog for `target`, the server answering the people and spaces searches. */
function renderDialog(target: LinkTarget) {
  fakeTransport((request) => {
    if (request.url === '/admin/users') {
      return page([
        person({ id: 5, name: 'Rima' }),
        person({
          id: 3,
          name: 'Hadi',
          role: 'OWNER',
          spaces: [{ id: 9, nameEn: 'Palm Hub', nameAr: null }],
        }),
        person({ id: 1, name: 'Admin', role: 'ADMIN' }),
      ]);
    }
    return page([
      space({ id: 7, nameEn: 'Focus Hub', isVerified: true, owners: [{ id: 6, name: 'Sami' }] }),
      space({ id: 9, nameEn: 'Palm Hub', isVerified: true, owners: [{ id: 3, name: 'Hadi' }] }),
    ]);
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <LinkOwnerDialog target={target} onClose={onClose} returnFocus={createRef()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('LinkOwnerDialog', () => {
  it('from a space: offers people by name or email, each saying what it is', async () => {
    renderDialog({
      from: 'space',
      space: { id: 7, name: { text: 'Focus Hub' } },
      addOwnerLink: '/dashboard/admin/owners',
    });

    const dialog = screen.getByRole('dialog', { name: 'Link an owner to Focus Hub' });
    expect(dialog).toHaveAccessibleDescription('It has no owner today.');
    expect(
      within(dialog).getByRole('link', {
        name: 'A new owner with no account? Add them on the space owners page.',
      }),
    ).toHaveAttribute('href', '/dashboard/admin/owners');

    await userEvent.click(within(dialog).getByRole('combobox', { name: /^Person/ }));

    expect(await screen.findByRole('combobox', { name: 'Search' })).toHaveAttribute(
      'placeholder',
      'Name or email',
    );
    const rima = await screen.findByRole('option', { name: /Rima/ });
    expect(within(rima).getByText('rima@example.com')).toBeInTheDocument();
    expect(within(rima).getByText('User')).toBeInTheDocument();
    const hadi = screen.getByRole('option', { name: /Hadi/ });
    expect(within(hadi).getByText(heard('Owner · Palm Hub'))).toBeInTheDocument();
    // An admin is never offered.
    expect(screen.queryByRole('option', { name: /Admin/ })).not.toBeInTheDocument();
  });

  it('from a person: offers spaces, the ones already theirs unavailable', async () => {
    renderDialog({ from: 'person', person: { id: 3, name: 'Hadi', spaceIds: [9] } });

    const dialog = screen.getByRole('dialog', { name: heard('Link Hadi to a space') });
    expect(dialog).toHaveAccessibleDescription('One space at a time.');

    await userEvent.click(within(dialog).getByRole('combobox', { name: /^Space/ }));

    const palm = await screen.findByRole('option', { name: /Palm Hub/ });
    expect(palm).toHaveAttribute('aria-disabled', 'true');
    expect(within(palm).getByText('Linked')).toBeInTheDocument();
    const focus = screen.getByRole('option', { name: /Focus Hub/ });
    expect(focus).toHaveAttribute('aria-disabled', 'false');
    expect(within(focus).queryByText('Linked')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    renderDialog({
      from: 'space',
      space: { id: 7, name: { text: 'Focus Hub' } },
      addOwnerLink: '/dashboard/admin/owners',
    });

    await screen.findByRole('dialog');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
