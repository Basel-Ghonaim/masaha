import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow, AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import type { AddedOwnerView } from '../../types/TemporaryPasswordSlot';
import { AddOwner } from './AddOwner';

/** A request the fake server received. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const FOCUS_HUB: AdminSpaceRow = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  isHidden: true,
  deletedAt: null,
  owners: [{ id: 3, name: 'Hadi' }],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00.000Z',
};

const RIMA: AdminUserRow = {
  id: 5,
  name: 'Rima Haddad',
  email: 'rima@example.com',
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
};

/** A page of `rows`, the only one. */
function page(rows: unknown[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 20,
    totalPages: rows.length > 0 ? 1 : 0,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

type Server = {
  /** The answer to adding an owner. */
  add?: (request: Request) => FakeAnswer;
  /** The users the users list finds for a search. */
  users?: AdminUserRow[];
};

/** The sheet as the owners page shows it, the server answering as `server` says. */
function renderSheet(server: Server = {}) {
  const shown: AddedOwnerView[] = [];
  const requests = fakeTransport((request) => {
    if (request.url === '/admin/spaces') return page([FOCUS_HUB]);
    if (request.url === '/admin/users') return page(server.users ?? []);
    return server.add?.(request) ?? ok({ userId: 12, temporaryPassword: 'Tmp-4821-xk' }, 201);
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AddOwner
        temporaryPassword={(added, done) => {
          shown.push(added);
          return (
            <div role="dialog" aria-label="Password slot">
              <button type="button" onClick={done}>
                Slot done
              </button>
            </div>
          );
        }}
      />
    </QueryClientProvider>,
  );
  return { requests, shown };
}

/** Opens the sheet and fills it: `name`, `email`, and Focus Hub chosen. */
async function fill(email = 'rima@example.com', name = 'Rima Haddad') {
  await userEvent.click(screen.getByRole('button', { name: 'Add owner' }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), name);
  await userEvent.type(screen.getByRole('textbox', { name: 'Email address' }), email);
  await userEvent.click(screen.getByRole('combobox', { name: /^Space/ }));
  await userEvent.click(await screen.findByRole('option', { name: /Focus Hub/ }));
}

/** The email has an account: the server asks for the upgrade until it is asked for. */
function hasAccount(request: Request): FakeAnswer {
  return (bodyOf(request) as { upgradeExisting?: boolean }).upgradeExisting === true
    ? ok({ userId: 5, temporaryPassword: null }, 201)
    : refused(409, { type: 'conflict', code: 'EMAIL_HAS_ACCOUNT' });
}

/** The notice under the fields, found by its title. */
function noticeTitled(title: string): HTMLElement {
  const notice = screen
    .getAllByRole('status')
    .find((element) => within(element).queryByText(title) !== null);
  expect(notice).toBeDefined();
  return notice as HTMLElement;
}

const adds = (requests: Request[]) =>
  requests.filter((request) => request.url === '/admin/owners').map(bodyOf);

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('AddOwner', () => {
  it('opens the sheet from «Add owner», its fields named, the notice saying what will happen', async () => {
    renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Add owner' }));

    const sheet = screen.getByRole('dialog', { name: 'Add owner' });
    expect(within(sheet).getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(within(sheet).getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
    expect(within(sheet).getByRole('combobox', { name: /^Space/ })).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        'An account will be created and a temporary password shown once — have a way to hand it over ready.',
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole('button', { name: 'Create account and link' }),
    ).toBeInTheDocument();
  });

  it('searches the spaces, each option with its state and its owners', async () => {
    const { requests } = renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Add owner' }));
    await userEvent.click(screen.getByRole('combobox', { name: /^Space/ }));

    const option = await screen.findByRole('option', { name: /Focus Hub/ });
    expect(within(option).getByText('Verified')).toBeInTheDocument();
    expect(within(option).getByText('Hidden')).toBeInTheDocument();
    expect(within(option).getByText('Hadi')).toBeInTheDocument();
    expect(requests.find((request) => request.url === '/admin/spaces')?.params).toEqual({
      limit: 50,
    });
  });

  it('shows the page’s password dialog once the owner is added, until it is done', async () => {
    const { requests, shown } = renderSheet();

    await fill('new@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create account and link' }));

    const slot = await screen.findByRole('dialog', { name: 'Password slot' });
    expect(adds(requests)).toEqual([{ name: 'Rima Haddad', email: 'new@example.com', spaceId: 7 }]);
    expect(shown.at(-1)).toEqual({
      userId: 12,
      name: 'Rima Haddad',
      email: 'new@example.com',
      temporaryPassword: 'Tmp-4821-xk',
    });
    await userEvent.click(within(slot).getByRole('button', { name: 'Slot done' }));
    expect(screen.queryByRole('dialog', { name: 'Password slot' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations, the sheet open', async () => {
    renderSheet();

    await userEvent.click(screen.getByRole('button', { name: 'Add owner' }));

    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('shows whose account the email is before the upgrade is confirmed, and sends it once confirmed', async () => {
    render(<Toaster label="Notifications" />);
    const { requests } = renderSheet({ add: hasAccount, users: [RIMA] });

    // The name typed is not the account's: the upgrade keeps the account's own.
    await fill('rima@example.com', 'Rima');
    await userEvent.click(screen.getByRole('button', { name: 'Create account and link' }));

    const upgrade = await screen.findByRole('button', { name: 'Upgrade and link' });
    const users = requests.filter((request) => request.url === '/admin/users');
    expect(users.map((request): unknown => request.params)).toEqual([{ q: 'rima@example.com' }]);
    const account = noticeTitled('This email has an account');
    expect(within(account).getByText('Rima Haddad')).toBeInTheDocument();
    expect(within(account).getByText(/^1 Sept/)).toBeInTheDocument();
    expect(within(account).getByText('None')).toBeInTheDocument();
    expect(
      within(account).getByText(
        'Make sure this is the person you mean: they’ll become an owner of this space',
      ),
    ).toBeInTheDocument();
    expect(adds(requests)).toHaveLength(1);

    await userEvent.click(upgrade);

    await waitFor(() => {
      expect(adds(requests)).toHaveLength(2);
    });
    expect(adds(requests)[1]).toEqual({
      name: 'Rima',
      email: 'rima@example.com',
      spaceId: 7,
      upgradeExisting: true,
    });
    expect(
      await findToast('Rima Haddad upgraded to owner and linked to Focus Hub'),
    ).toBeInTheDocument();
  });

  it('offers no upgrade when no account has exactly this email', async () => {
    const { requests } = renderSheet({
      add: hasAccount,
      // The search finds a longer email that holds this one; it is someone else's.
      users: [{ ...RIMA, email: 'karima@example.com' }],
    });

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Create account and link' }));

    expect(
      await screen.findByText(
        'We couldn’t show whose account this is, so it can’t be upgraded here — check the email.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upgrade and link' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rima Haddad')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account and link' })).toBeDisabled();
    expect(adds(requests)).toHaveLength(1);
  });
});
