import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  announcement,
  announcementsPage,
  announcementsSummary,
  closure,
} from '../../../../test/announcement';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { AnnouncementsList } from '../../components/list/AnnouncementsList';

const LIST = '/manage/spaces/7/announcements';

const EXTENDED = closure({
  extension: {
    days: 3,
    subscriptions: 4,
    appliedAt: '2026-10-21T08:00:00.000Z',
    appliedBy: { id: 1, name: 'Sara' },
  },
});

/**
 * The list of `rows`, its writes answered by `write`; the list's reads answered as the server would.
 * Its requests, but the reads, are the writes it sent.
 */
function renderList(
  rows: ManagedAnnouncement[],
  write: () => FakeAnswer | Promise<FakeAnswer> = () => ok(announcement()),
) {
  const requests = fakeTransport((request) => {
    if (request.method === 'get') {
      return request.url === `${LIST}/summary`
        ? ok(announcementsSummary())
        : announcementsPage(rows);
    }
    return write();
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <AnnouncementsList spaceId={7} owner />
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const writes = () =>
    requests
      .filter(({ method }) => method !== 'get')
      .map((request) => ({ line: `${String(request.method)} ${String(request.url)}`, request }));
  return { writes };
}

/** The cards drawn, in order. */
async function cards() {
  const list = await screen.findByRole('region', { name: 'Announcements' });
  return within(list).findAllByRole('listitem');
}

/** Presses a toast's action by its key: jsdom has no pointer capture for Sonner's. */
async function pressInToast(user: ReturnType<typeof userEvent.setup>, name: string) {
  screen.getByRole('button', { name }).focus();
  await user.keyboard('{Enter}');
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useAnnouncementActions', () => {
  it('ends a running one at once; its «Undo» sends one PATCH with the old end', async () => {
    const user = userEvent.setup();
    const running = announcement();
    const { writes } = renderList([running]);

    const [card] = await cards();
    if (card === undefined) throw new Error('One card');
    await user.click(within(card).getByRole('button', { name: 'End now' }));
    await findToast('The announcement has ended');
    expect(screen.getByText('In “Ended”')).toBeInTheDocument();

    await pressInToast(user, 'Undo');
    await findToast('The announcement is back as it was');
    expect(writes().map(({ line }) => line)).toEqual([`post ${LIST}/5/end`, `patch ${LIST}/5`]);
    expect(bodyOf(writes()[1]?.request)).toEqual({ endsAt: running.endsAt });
    expect(writes().map(({ request }) => request.headers.get('Idempotency-Key'))).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('offers no «Undo» on an extended closure’s end now, whose end may only come earlier', async () => {
    const user = userEvent.setup();
    renderList([EXTENDED]);

    const [card] = await cards();
    if (card === undefined) throw new Error('One card');
    await user.click(within(card).getByRole('button', { name: 'End now' }));
    await findToast('The closure has ended · the status is automatic again');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
  });

  it('starts an upcoming one now, its toast naming «Active»', async () => {
    const user = userEvent.setup();
    const { writes } = renderList([announcement({ state: 'UPCOMING' })]);

    const [card] = await cards();
    if (card === undefined) throw new Error('One card');
    await user.click(within(card).getByRole('button', { name: 'Start now' }));
    await findToast('The announcement has started');
    expect(screen.getByText('In “Active”')).toBeInTheDocument();
    expect(writes().map(({ line }) => line)).toEqual([`post ${LIST}/5/start`]);
  });

  it('sends nothing again by itself after no answer; «Try again» sends it once more', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let lost = true;
    const { writes } = renderList([announcement()], () =>
      lost ? { failure: 'ERR_NETWORK' } : ok(announcement({ state: 'ENDED' })),
    );

    const [card] = await cards();
    if (card === undefined) throw new Error('One card');
    await user.click(within(card).getByRole('button', { name: 'End now' }));
    await findToast('We couldn’t do that');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(writes()).toHaveLength(1);
    expect(screen.getByText('No connection. Check your internet and try again.')).toBeVisible();

    lost = false;
    await pressInToast(user, 'Try again');
    await findToast('The announcement has ended');
    expect(writes()).toHaveLength(2);
  });

  it('words a start that would end too far ahead, and an end of one another desk moved later', async () => {
    const user = userEvent.setup();
    let answer = refused(422, { type: 'validation', errors: { endsAt: ['out_of_range'] } });
    renderList([announcement({ id: 1, state: 'UPCOMING' }), announcement({ id: 2 })], () => answer);

    const [upcoming, running] = await cards();
    if (upcoming === undefined || running === undefined) throw new Error('Two cards');
    await user.click(within(upcoming).getByRole('button', { name: 'Start now' }));
    expect(
      await screen.findByText('Its end is more than 365 days from now; edit it first.'),
    ).toBeVisible();

    answer = refused(409, { type: 'conflict', code: 'ANNOUNCEMENT_NOT_STARTED' });
    await user.click(within(running).getByRole('button', { name: 'End now' }));
    expect(await screen.findByText('This announcement has not started yet.')).toBeVisible();

    answer = refused(403, { type: 'forbidden' });
    await user.click(within(running).getByRole('button', { name: 'End now' }));
    expect(await screen.findByText('This is no longer open to you at this space.')).toBeVisible();
  });

  it('offers end now on a running one, start now on an upcoming one, neither on an ended one', async () => {
    renderList([
      announcement({ id: 1 }),
      announcement({ id: 2, state: 'UPCOMING' }),
      announcement({ id: 3, state: 'ENDED' }),
    ]);

    const [running, upcoming, ended] = await cards();
    if (running === undefined || upcoming === undefined || ended === undefined) {
      throw new Error('Three cards');
    }
    const names = (card: HTMLElement) =>
      within(card)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names(running)).toEqual([
      'Edit',
      'End now',
      expect.stringMatching(/^More actions: General · /),
    ]);
    expect(names(upcoming)).toEqual([
      'Edit',
      'Start now',
      expect.stringMatching(/^More actions: General · /),
    ]);
    expect(names(ended)).toEqual([expect.stringMatching(/^More actions: General · /)]);
  });

  it('never offers «Delete…» on an extended closure, and says why', async () => {
    const user = userEvent.setup();
    renderList([EXTENDED, closure({ id: 10 })]);

    const [extended, plain] = await cards();
    if (extended === undefined || plain === undefined) throw new Error('Two cards');
    expect(within(extended).queryByRole('button', { name: /^More actions/ })).toBeNull();
    expect(
      within(extended).getByText(
        'Its subscriptions were extended, so it isn’t deleted and its end isn’t moved later.',
      ),
    ).toBeInTheDocument();

    await user.click(within(plain).getByRole('button', { name: /^More actions/ }));
    expect(await screen.findByRole('menuitem', { name: 'Delete…' })).toBeInTheDocument();
  });
});
