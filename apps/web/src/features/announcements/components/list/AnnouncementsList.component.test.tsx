import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  announcement,
  announcementsPage,
  announcementsSummary,
  closure,
} from '../../../../test/announcement';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { AnnouncementsList } from './AnnouncementsList';

/** The address the list writes, shown so a test can read it. */
function Address() {
  return <output aria-label="Address">{useLocation().search}</output>;
}

function renderList(rows: ManagedAnnouncement[], path = '/p') {
  fakeTransport((request) =>
    request.url?.endsWith('/summary') === true
      ? ok(announcementsSummary())
      : announcementsPage(rows),
  );
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <main>
          <h1>Announcements</h1>
          <AnnouncementsList spaceId={7} owner />
        </main>
        <Address />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ROWS = [closure(), announcement({ id: 6, type: 'OFFER', textEn: null })];

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AnnouncementsList', () => {
  it.each([1440, 390])(
    'names its tabs, counts each as a badge, and draws each card by its type alone; axe-clean at %i',
    async (width) => {
      stubScreenWidth(width);
      const { container } = renderList(ROWS);

      const tabs = screen.getByRole('tablist', { name: 'Announcement status' });
      expect(
        await within(tabs).findByRole('tab', { name: 'Active 2', selected: true }),
      ).toBeInTheDocument();
      expect(within(tabs).getByRole('tab', { name: 'Scheduled 1' })).toBeInTheDocument();
      expect(within(tabs).getByRole('tab', { name: 'Ended 7' })).toBeInTheDocument();

      const list = await screen.findByRole('region', { name: 'Announcements' });
      const cards = await within(list).findAllByRole('listitem');
      expect(cards).toHaveLength(2);
      const [first, second] = cards;
      if (first === undefined || second === undefined) throw new Error('Two cards');
      // The type is the card's heading, as its badge, warning for a closure; no status badge.
      const closureBadge = within(first).getByRole('heading', { name: 'Temporary closure' });
      expect(closureBadge.querySelector('[data-variant]')).toHaveAttribute(
        'data-variant',
        'warning',
      );
      expect(
        within(second).getByRole('heading', { name: 'Offer' }).querySelector('[data-variant]'),
      ).toHaveAttribute('data-variant', 'neutral');
      for (const card of cards) {
        expect(within(card).queryByText(/^(Active|Scheduled|Ended)$/)).toBeNull();
        expect(card.querySelectorAll('[data-variant]')).toHaveLength(1);
      }
      // An English text missing: the Arabic, marked as Arabic.
      expect(within(second).getByText('ورشة تصميم مساء الخميس')).toHaveAttribute('lang', 'ar');

      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it('opens the tab chosen, written in the address', async () => {
    stubScreenWidth(1440);
    renderList(ROWS);

    await userEvent.click(await screen.findByRole('tab', { name: 'Ended 7' }));
    expect(screen.getByRole('status', { name: 'Address' })).toHaveTextContent('?state=ended');
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Ended 7' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('opens the sheet from «New announcement», and gives the focus back to it once closed', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderList(ROWS);

    const create = await screen.findByRole('button', { name: 'New announcement' });
    await user.click(create);
    expect(await screen.findByRole('dialog', { name: 'New announcement' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(create).toHaveFocus();
  });

  it('offers «Edit» on a running or upcoming card, and none on an ended one', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup();
    renderList([announcement({ id: 1 }), announcement({ id: 2, state: 'ENDED' })]);

    const list = await screen.findByRole('region', { name: 'Announcements' });
    const [running, ended] = await within(list).findAllByRole('listitem');
    if (running === undefined || ended === undefined) throw new Error('Two cards');
    expect(within(ended).queryByRole('button', { name: 'Edit' })).toBeNull();
    await user.click(within(running).getByRole('button', { name: 'Edit' }));
    const sheet = await screen.findByRole('dialog', { name: 'Edit announcement' });
    expect(within(sheet).getByRole('textbox', { name: 'Text in English' })).toHaveValue(
      'A design workshop on Thursday evening',
    );
  });

  it('draws three skeleton cards while the list loads, the list busy', () => {
    stubScreenWidth(1440);
    fakeTransport(() => new Promise(() => undefined));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <AnnouncementsList spaceId={7} owner />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const list = screen.getByRole('region', { name: 'Announcements' });
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(list.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });

  describe('a refusal stays in its dialog while the list is read again', () => {
    const EXTENDED = {
      days: 2,
      subscriptions: 3,
      appliedAt: '2026-10-21T08:00:00.000Z',
      appliedBy: { id: 14, name: 'Ahmad' },
    };

    /** The list of one running closure, extended by another desk once `extendedMeanwhile` is set. */
    function renderClosure(write: () => ReturnType<typeof refused>) {
      let extendedMeanwhile = false;
      const requests = fakeTransport((request) => {
        if (request.method !== 'get') {
          extendedMeanwhile = true;
          return write();
        }
        if (request.url?.endsWith('/summary') === true) return ok(announcementsSummary());
        if (request.url?.endsWith('/extend-subscriptions') === true) {
          return ok({
            firstDay: '2026-10-20',
            lastDay: '2026-10-21',
            proposedDays: 2,
            subscriptions: 3,
            applied: null,
          });
        }
        return announcementsPage([closure({ extension: extendedMeanwhile ? EXTENDED : null })]);
      });
      render(
        <QueryClientProvider client={createQueryClient()}>
          <MemoryRouter initialEntries={['/p']}>
            <AnnouncementsList spaceId={7} owner />
          </MemoryRouter>
        </QueryClientProvider>,
      );
      /** Whether the list was read again after the write. */
      const readAgain = () =>
        requests.findLastIndex(
          (request) => request.method === 'get' && request.url === '/manage/spaces/7/announcements',
        ) > requests.findIndex((request) => request.method !== 'get');
      return { readAgain };
    }

    /** The focus once the dialog closed: on a card's action, else on the tab shown. */
    const focusPlaced = () => {
      const focused = document.activeElement;
      expect(focused).not.toBe(document.body);
      expect(
        focused?.hasAttribute('data-card-action') === true ||
          focused?.getAttribute('role') === 'tab',
      ).toBe(true);
    };

    it('keeps the delete’s CLOSURE_EXTENDED until «Back», though the card no longer offers the delete', async () => {
      const user = userEvent.setup();
      const { readAgain } = renderClosure(() =>
        refused(409, { type: 'conflict', code: 'CLOSURE_EXTENDED' }),
      );

      await user.click(await screen.findByRole('button', { name: /^More actions/ }));
      await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
      await waitFor(() => {
        expect(readAgain()).toBe(true);
      });
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
      expect(screen.getByRole('alertdialog')).toBe(dialog);
      expect(within(dialog).getByRole('alert')).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Back' }));
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).toBeNull();
      });
      focusPlaced();
    });
  });
});
