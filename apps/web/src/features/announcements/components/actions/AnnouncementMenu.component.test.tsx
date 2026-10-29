import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  announcement,
  announcementsPage,
  announcementsSummary,
} from '../../../../test/announcement';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { AnnouncementsList } from '../list/AnnouncementsList';

const LIST = '/manage/spaces/7/announcements';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The list of `rows()`, read again after each write; every write answered as done. */
function renderList(rows: () => ManagedAnnouncement[]) {
  fakeTransport((request) => {
    if (request.method === 'get') {
      return request.url === `${LIST}/summary`
        ? ok(announcementsSummary())
        : announcementsPage(rows());
    }
    return { status: 204 };
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <AnnouncementsList spaceId={7} owner />
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
}

/** The «⋯» of the one card, named by its announcement. */
const menu = () =>
  screen.getByRole('button', { name: heard('More actions: General · 21 October 08:00–18:00') });

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('AnnouncementMenu', () => {
  it('is named by its announcement, and gives the focus back to the «⋯» after the dialog', async () => {
    const user = userEvent.setup();
    renderList(() => [announcement({ state: 'ENDED' })]);

    await screen.findByRole('region', { name: 'Announcements' });
    const more = await waitFor(menu);
    await user.click(more);
    expect(
      await screen.findByRole('menu', {
        name: heard('More actions: General · 21 October 08:00–18:00'),
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Delete…' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(more).toHaveFocus();
    });
  });

  it('gives the focus to the next card’s first action once the card is deleted, else the tab shown', async () => {
    const user = userEvent.setup();
    let rows = [announcement({ id: 1 }), announcement({ id: 2, state: 'ENDED' })];
    renderList(() => rows);

    const list = await screen.findByRole('region', { name: 'Announcements' });
    const [first] = await within(list).findAllByRole('listitem');
    if (first === undefined) throw new Error('Two cards');
    await user.click(within(first).getByRole('button', { name: /^More actions/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    rows = [announcement({ id: 2, state: 'ENDED' })];
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    // The second card's first action: its «⋯», the only action of an ended announcement.
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    });
    const [second] = within(list).getAllByRole('listitem');
    if (second === undefined) throw new Error('One card');
    await waitFor(() => {
      expect(within(second).getByRole('button', { name: /^More actions/ })).toHaveFocus();
    });

    await user.click(within(second).getByRole('button', { name: /^More actions/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    rows = [];
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /^Active/ })).toHaveFocus();
    });
  });
});
