import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow, AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
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

/**
 * The dialog for `target`, the server answering the people and spaces searches, and space 7's own
 * read with `owners` (none by default).
 */
function renderDialog(target: LinkTarget, owners: { id: number; name: string }[] = []) {
  const requests = fakeTransport((request) => {
    if (request.url === '/admin/spaces/7') {
      return { status: 200, data: { success: true, data: { id: 7, owners } } };
    }
    if (request.url === '/admin/spaces/7/owners') {
      return { status: 204 };
    }
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
        person({
          id: 8,
          name: 'Lina',
          receptionSpaces: [
            { id: 4, nameEn: 'Sea View', nameAr: 'إطلالة البحر' },
            { id: 2, nameEn: 'Dawn Desk', nameAr: null },
          ],
        }),
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
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { onClose, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
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

  it('a receptionist’s option reads «مستخدم · استقبال {spaces}», and the line before the act keeps that link', async () => {
    renderDialog({
      from: 'space',
      space: { id: 7, name: { text: 'Focus Hub' } },
      addOwnerLink: '/dashboard/admin/owners',
    });

    const dialog = screen.getByRole('dialog', { name: 'Link an owner to Focus Hub' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: /^Person/ }));
    const lina = await screen.findByRole('option', { name: /Lina/ });
    expect(
      within(lina).getByText(heard('User · reception at Sea View, Dawn Desk')),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('option', { name: /Rima/ })).getByText('User'),
    ).toBeInTheDocument();
    await userEvent.click(lina);

    expect(
      within(dialog).getByText(
        heard('Works the front desk at Sea View, Dawn Desk; that link stays.'),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Their account becomes an owner’s, and they’re asked to sign in again.',
      ),
    ).toBeInTheDocument();
  });

  it('a space linked meanwhile is worded as another owner', async () => {
    const { requests, onClose } = renderDialog(
      {
        from: 'space',
        space: { id: 7, name: { text: 'Focus Hub' } },
        addOwnerLink: '/dashboard/admin/owners',
      },
      [{ id: 6, name: 'Sami' }],
    );

    const dialog = screen.getByRole('dialog', { name: 'Link an owner to Focus Hub' });
    expect(
      await within(dialog).findByText('They become another owner of this space.'),
    ).toBeInTheDocument();
    expect(requests.some((request) => request.url === '/admin/spaces/7')).toBe(true);
    await userEvent.click(within(dialog).getByRole('combobox', { name: /^Person/ }));
    await userEvent.click(await screen.findByRole('option', { name: /Hadi/ }));
    expect(dialog.textContent.replace(/[⁦-⁩]/g, '')).toContain(
      'They become another owner of Focus Hub; it stays verified.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Link' }));

    expect(await findToast('An owner was added to the space')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('a space with no owner as read now becomes verified, and says so', async () => {
    const { onClose } = renderDialog({
      from: 'space',
      space: { id: 7, name: { text: 'Focus Hub' } },
      addOwnerLink: '/dashboard/admin/owners',
    });

    const dialog = screen.getByRole('dialog', { name: 'Link an owner to Focus Hub' });
    await userEvent.click(within(dialog).getByRole('combobox', { name: /^Person/ }));
    await userEvent.click(await screen.findByRole('option', { name: /Hadi/ }));
    expect(within(dialog).getByText(/becomes verified and its owner edits it/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Link' }));

    expect(await findToast('The space is now verified')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('from a person: offers spaces, the ones already theirs unavailable', async () => {
    renderDialog({
      from: 'person',
      person: { id: 3, name: 'Hadi', role: 'OWNER', spaceIds: [9], deskIds: [] },
    });

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

  it('from a person, offers their reception desks as unavailable, saying so', async () => {
    renderDialog({
      from: 'person',
      person: { id: 5, name: 'Rima', role: 'USER', spaceIds: [], deskIds: [7] },
    });

    await userEvent.click(screen.getByRole('combobox', { name: /^Space/ }));

    const focus = await screen.findByRole('option', { name: /Focus Hub/ });
    expect(focus).toHaveAttribute('aria-disabled', 'true');
    expect(within(focus).getByText('Front desk')).toBeInTheDocument();
    const palm = screen.getByRole('option', { name: /Palm Hub/ });
    expect(palm).toHaveAttribute('aria-disabled', 'false');
    expect(within(palm).queryByText('Front desk')).not.toBeInTheDocument();
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
