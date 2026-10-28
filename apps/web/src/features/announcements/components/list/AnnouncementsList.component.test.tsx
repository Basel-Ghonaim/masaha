import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
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
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
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
});
