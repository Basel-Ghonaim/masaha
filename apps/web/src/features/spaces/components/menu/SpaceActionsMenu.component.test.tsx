import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { findToast } from '../../../../test/findToast';
import { SpaceActionsHold } from '../hold/SpaceActionsHold';
import { SpaceActionsMenu } from './SpaceActionsMenu';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const FOCUS = { id: 7, nameEn: 'Focus Hub', nameAr: 'فوكس', isHidden: false, deletedAt: null };
const PALM = { id: 9, nameEn: 'Palm Hub', nameAr: null, isHidden: true, deletedAt: null };
const OLIVE = {
  id: 12,
  nameEn: 'Olive Desk',
  nameAr: null,
  isHidden: false,
  deletedAt: '2026-10-01T08:00:00Z',
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** Two rows' menus, as the list sets them, with the hold above; the server answers each write. */
function renderMenus(
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ({
    status: 204,
  }),
) {
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : write(request)));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <SpaceActionsHold />
          <SpaceActionsMenu space={FOCUS} editLink="/spaces/7" />
          <SpaceActionsMenu space={PALM} editLink="/spaces/9" />
          <SpaceActionsMenu space={OLIVE} editLink="/spaces/12" />
        </main>
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { writes };
}

/** The toast whose title reads `text`, as a reader hears it, once it shows. */
const toastTitled = (text: string) =>
  findToast(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === text,
  );

const menuButton = (name: string) =>
  screen.getByRole('button', { name: heard(`Actions: ${name}`) });

const restoreButton = (name: string) =>
  screen.getByRole('button', { name: heard(`Restore ${name}`) });

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('SpaceActionsMenu', () => {
  it('opens from the keyboard: Edit, Hide for a shown space, then Delete', async () => {
    renderMenus();

    menuButton('Focus Hub').focus();
    await userEvent.keyboard('{Enter}');

    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Edit', 'Hide', 'Delete']);
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Hide' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('offers Show for a hidden space', async () => {
    renderMenus();

    await userEvent.click(menuButton('Palm Hub'));

    expect(await screen.findByRole('menuitem', { name: 'Show' })).toBeInTheDocument();
  });

  it('hides the space from the menu, the button keeping the focus while it waits', async () => {
    const answer = deferred<FakeAnswer>();
    const { writes } = renderMenus(() => answer.promise);

    await userEvent.click(menuButton('Focus Hub'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Hide' }));

    expect(bodyOf(writes()[0])).toEqual({ isHidden: true });
    const button = menuButton('Focus Hub');
    expect(button).toHaveFocus();
    // The pending state reaches the row on a later tick than the click.
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: 'Hide' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.keyboard('{Escape}');

    await act(async () => {
      answer.resolve({ status: 204 });
      await answer.promise;
    });
    await waitFor(() => {
      expect(menuButton('Focus Hub')).not.toHaveAttribute('aria-busy');
    });
    expect(await toastTitled('Focus Hub is hidden from the site')).toBeVisible();
  });

  it('shows a hidden space again from the menu', async () => {
    const { writes } = renderMenus();

    await userEvent.click(menuButton('Palm Hub'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Show' }));

    expect(bodyOf(writes()[0])).toEqual({ isHidden: false });
    expect(await toastTitled('Palm Hub is visible again')).toBeVisible();
  });

  it('asks before deleting, opening on Cancel, its title naming the space', async () => {
    renderMenus();

    await userEvent.click(menuButton('Focus Hub'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Focus Hub?' });
    expect(
      within(dialog).getByText(
        'It leaves the site and the list; you’ll find it under «Deleted» to restore it.',
      ),
    ).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('marks an English-only name as English in the Arabic dialog’s title', async () => {
    startPreferences('ar');
    renderMenus();

    await userEvent.click(screen.getByRole('button', { name: heard('إجراءات: Palm Hub') }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'حذف' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'حذف Palm Hub؟' });
    expect(within(dialog).getByText('Palm Hub')).toHaveAttribute('lang', 'en');
    expect(within(dialog).getByText('Palm Hub')).toHaveAttribute('dir', 'ltr');
  });

  it.each([
    ['Escape', '{Escape}'],
    ['Cancel', '{Enter}'],
  ])('deletes nothing on %s, and returns the focus to the menu’s button', async (_answer, keys) => {
    const { writes } = renderMenus();
    await userEvent.click(menuButton('Focus Hub'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await screen.findByRole('alertdialog');

    await userEvent.keyboard(keys);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
    expect(menuButton('Focus Hub')).toHaveFocus();
    expect(writes()).toEqual([]);
  });

  it('deletes the space on Delete, returning the focus to the menu’s button', async () => {
    const { writes } = renderMenus();
    await userEvent.click(menuButton('Focus Hub'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
    expect(writes()).toHaveLength(1);
    expect(await toastTitled('Focus Hub deleted')).toBeVisible();
    expect(menuButton('Focus Hub')).toHaveFocus();
  });

  it('holds every row’s actions while a 429 counts down, and shows the wait above them, but never Edit', async () => {
    renderMenus(() => refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }));

    await userEvent.click(menuButton('Focus Hub'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Hide' }));

    expect(
      await screen.findByText('Too many attempts. Try again in ⁦0:30⁩.', {
        selector: '[data-slot=alert-description]',
      }),
    ).toBeVisible();
    await userEvent.click(menuButton('Palm Hub'));
    const menu = await screen.findByRole('menu');
    for (const name of ['Show', 'Delete']) {
      expect(within(menu).getByRole('menuitem', { name })).toHaveAttribute('aria-disabled', 'true');
    }
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('has no accessibility violations, with its menu open, and with its dialog open', async () => {
    renderMenus();

    await userEvent.click(menuButton('Focus Hub'));
    await screen.findByRole('menu');
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await screen.findByRole('alertdialog');
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it('leads to the space’s editor from Edit', async () => {
    renderMenus();

    await userEvent.click(menuButton('Palm Hub'));

    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/spaces/9',
    );
  });
});

describe('SpaceActionsMenu, for a deleted space', () => {
  it('offers Restore alone, where the row’s menu stood', () => {
    renderMenus();

    expect(restoreButton('Olive Desk')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: heard('Actions: Olive Desk') })).toBeNull();
  });

  it('restores the space, its button pending and holding the focus, then says so by its name', async () => {
    const answer = deferred<FakeAnswer>();
    const { writes } = renderMenus(() => answer.promise);
    const restore = restoreButton('Olive Desk');
    restore.focus();

    await userEvent.click(restore);

    const write = writes();
    expect(write).toHaveLength(1);
    expect(write[0]?.url).toContain('/admin/spaces/12/restore');
    // The pending state reaches the row on a later tick than the click.
    await waitFor(() => {
      expect(restoreButton('Olive Desk')).toHaveAttribute('aria-busy', 'true');
    });
    expect(restoreButton('Olive Desk')).toHaveFocus();

    await act(async () => {
      answer.resolve({ status: 204 });
      await answer.promise;
    });

    expect(await toastTitled('Olive Desk restored')).toBeVisible();
  });

  it('names the space when the server refuses, with the refusal’s reference', async () => {
    renderMenus(() => refused(409, { type: 'conflict' }));

    await userEvent.click(restoreButton('Olive Desk'));

    expect(await toastTitled('Couldn’t restore Olive Desk')).toBeVisible();
    expect(screen.getByText(/req-1/)).toBeInTheDocument();
  });

  it('waits its button while a 429 counts down, and acts once the wait is over', async () => {
    const { writes } = renderMenus(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    await userEvent.click(restoreButton('Olive Desk'));

    await waitFor(() => {
      expect(restoreButton('Olive Desk')).toHaveAttribute('aria-disabled', 'true');
    });
    await userEvent.click(restoreButton('Olive Desk'));
    expect(writes()).toHaveLength(1);
    // It stays in the focus order and where it was, so the keyboard keeps its place.
    expect(restoreButton('Olive Desk')).toBeVisible();
  });

  it('restores once, however many times it is clicked while it waits', async () => {
    const answer = deferred<FakeAnswer>();
    const { writes } = renderMenus(() => answer.promise);

    await userEvent.click(restoreButton('Olive Desk'));
    await waitFor(() => {
      expect(restoreButton('Olive Desk')).toHaveAttribute('aria-busy', 'true');
    });
    await userEvent.click(restoreButton('Olive Desk'));

    expect(writes()).toHaveLength(1);
    await act(async () => {
      answer.resolve({ status: 204 });
      await answer.promise;
    });
    expect(await toastTitled('Olive Desk restored')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    renderMenus();

    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
