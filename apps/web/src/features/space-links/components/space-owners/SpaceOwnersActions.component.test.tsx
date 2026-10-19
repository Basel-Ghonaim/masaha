import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminUserRow } from '@masaha/shared/space-links';
import { api, createQueryClient } from '@shared/api';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { SpaceOwnersActions } from './SpaceOwnersActions';

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

type Owner = { id: number; name: string };

const RIMA: Owner = { id: 5, name: 'Rima' };
const SAMI: Owner = { id: 6, name: 'Sami' };
const OWNERS = [RIMA, SAMI];

/** The actions as the editor of Focus Hub shows them, for a space verified or not. */
function renderActions(space: { isVerified: boolean; unsaved?: boolean }) {
  fakeTransport((request) =>
    request.url === '/admin/spaces/7'
      ? ok({ id: 7, isVerified: true, owners: OWNERS })
      : ok([], 200),
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <SpaceOwnersActions
          space={{
            id: 7,
            name: { text: 'Focus Hub' },
            isVerified: space.isVerified,
            owners: space.isVerified ? OWNERS : [],
            unsaved: space.unsaved ?? false,
            focusFallback: createRef(),
          }}
          addOwnerLink="/dashboard/admin/owners"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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

const RIMA_ROW: AdminUserRow = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
};

/**
 * The actions in an editor as `SpaceEditor` holds them: a notice that stays, focusable, whose content
 * is swapped whole when the space's verification changes, the slot inside it; the space read from a
 * server whose owners the link and the unlink change.
 */
function Editor() {
  const notice = useRef<HTMLDivElement>(null);
  const space = useQuery({
    queryKey: ['admin', 'test', 'space'],
    queryFn: () => api.get<{ isVerified: boolean; owners: Owner[] }>('/admin/spaces/7'),
  });
  if (space.data === undefined) return null;
  const actions = (
    <SpaceOwnersActions
      space={{
        id: 7,
        name: { text: 'Focus Hub' },
        isVerified: space.data.isVerified,
        owners: space.data.owners,
        unsaved: false,
        focusFallback: notice,
      }}
      addOwnerLink="/dashboard/admin/owners"
    />
  );
  return (
    <div ref={notice} tabIndex={-1} data-testid="notice">
      {space.data.isVerified ? <section>{actions}</section> : <aside>{actions}</aside>}
    </div>
  );
}

/** The editor of Focus Hub, its owners `owners` at first, changed by each link and unlink. */
function renderEditor(owners: Owner[]) {
  let current = [...owners];
  fakeTransport((request) => {
    if (request.url === '/admin/users') return page([RIMA_ROW]);
    if (request.method === 'post') {
      current = [...current, RIMA];
      return { status: 204 };
    }
    if (request.method === 'delete') {
      const userId = Number(request.url?.split('/').at(-1));
      current = current.filter((owner) => owner.id !== userId);
      return { status: 204 };
    }
    return ok({ id: 7, isVerified: current.length > 0, owners: current });
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <Editor />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Confirms the unlink once the space's owners are read. */
async function confirmUnlink() {
  const dialog = await screen.findByRole('alertdialog');
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeEnabled();
  });
  await userEvent.click(screen.getByRole('button', { name: 'Unlink' }));
  await waitFor(() => {
    expect(dialog).not.toBeInTheDocument();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('SpaceOwnersActions', () => {
  it('offers one «Unlink {name}» per owner of a verified space, each asking first', async () => {
    renderActions({ isVerified: true });

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent.replace(/[⁦-⁩]/g, ''))).toEqual([
      'Unlink Rima',
      'Unlink Sami',
    ]);
    expect(screen.queryByRole('button', { name: 'Link an owner' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: heard('Unlink Sami') }));

    expect(
      await screen.findByRole('alertdialog', { name: heard('Unlink Sami from Focus Hub?') }),
    ).toBeInTheDocument();
  });

  it('offers to link an owner to an unverified space, and no unlink', async () => {
    renderActions({ isVerified: false });

    expect(screen.queryByRole('button', { name: /^Unlink/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Link an owner' }));

    expect(
      await screen.findByRole('dialog', { name: 'Link an owner to Focus Hub' }),
    ).toBeInTheDocument();
  });

  it('holds the link while the editor has unsaved changes, saying why, and keeps it in reach', async () => {
    renderActions({ isVerified: false, unsaved: true });

    const link = screen.getByRole('button', { name: 'Link an owner' });
    // Marked, not disabled: the keyboard still reaches it, and hears why it waits.
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAccessibleDescription('Save or discard your changes first');
    await userEvent.tab();
    expect(link).toHaveFocus();

    await userEvent.click(link);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SpaceOwnersActions, once a link or an unlink is made', () => {
  it('moves the focus to the notice when a link turns the space verified', async () => {
    renderEditor([]);

    await userEvent.click(await screen.findByRole('button', { name: 'Link an owner' }));
    await userEvent.click(await screen.findByRole('combobox', { name: /^Person/ }));
    await userEvent.click(await screen.findByRole('option', { name: /Rima/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Link' }));

    expect(await screen.findByRole('button', { name: heard('Unlink Rima') })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('notice')).toHaveFocus();
    });
  });

  it('moves the focus to the notice when the last owner’s unlink turns the space unverified', async () => {
    renderEditor([RIMA]);

    await userEvent.click(await screen.findByRole('button', { name: heard('Unlink Rima') }));
    await confirmUnlink();

    expect(await screen.findByRole('button', { name: 'Link an owner' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('notice')).toHaveFocus();
    });
  });

  it('moves the focus to the notice when one of several owners is unlinked', async () => {
    renderEditor([RIMA, SAMI]);

    await userEvent.click(await screen.findByRole('button', { name: heard('Unlink Sami') }));
    await confirmUnlink();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: heard('Unlink Sami') })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('notice')).toHaveFocus();
    });
  });
});
