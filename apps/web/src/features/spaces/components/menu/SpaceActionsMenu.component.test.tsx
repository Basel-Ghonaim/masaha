import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
import { SpaceActionsHold } from '../hold/SpaceActionsHold';
import { SpaceActionsMenu } from './SpaceActionsMenu';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const FOCUS = { id: 7, nameEn: 'Focus Hub', nameAr: 'فوكس', state: 'unverified' as const };
const PALM = { id: 9, nameEn: 'Palm Hub', nameAr: null, state: 'hidden' as const };

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
      <main>
        <SpaceActionsHold />
        <SpaceActionsMenu space={FOCUS} />
        <SpaceActionsMenu space={PALM} />
      </main>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { writes };
}

/** The toast whose title reads `text`, as a reader hears it. */
const toastTitled = (text: string) =>
  screen.findByText(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === text,
  );

const menuButton = (name: string) =>
  screen.getByRole('button', { name: heard(`Actions: ${name}`) });

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
  it('opens from the keyboard: Hide for a shown space, then Delete', async () => {
    renderMenus();

    menuButton('Focus Hub').focus();
    await userEvent.keyboard('{Enter}');

    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Hide', 'Delete']);
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
      within(dialog).getByText('It leaves the site and this list. You can undo it right after.'),
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

  it('holds every row’s items while a 429 counts down, and shows the wait above them', async () => {
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
    for (const item of within(menu).getAllByRole('menuitem')) {
      expect(item).toHaveAttribute('aria-disabled', 'true');
    }
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
});
