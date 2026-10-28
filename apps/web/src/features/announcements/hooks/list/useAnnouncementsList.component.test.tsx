import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  announcement,
  announcementsPage,
  announcementsSummary,
  closure,
} from '../../../../test/announcement';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useAnnouncementsList } from './useAnnouncementsList';

type Answer = (url: string) => FakeAnswer | Promise<FakeAnswer>;

const LIST = '/manage/spaces/7/announcements';

/** The list on a page at `path`, its reads answered by `answer`, with the address it writes. */
function renderList(answer: Answer, { path = '/p', owner = true } = {}) {
  const requests = fakeTransport((request) => answer(request.url ?? ''));
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const rendered = renderHook(
    () => ({ list: useAnnouncementsList(7, { owner }), location: useLocation() }),
    { wrapper },
  );
  return { ...rendered, requests, client };
}

/** The summary, and a page of `rows` for the list. */
const serving =
  (rows = [announcement()], page: { total?: number; currentPage?: number } = {}): Answer =>
  (url) =>
    url.endsWith('/summary') ? ok(announcementsSummary()) : announcementsPage(rows, page);

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useAnnouncementsList', () => {
  it('counts each tab from the summary, and lists the cards in the server’s order', async () => {
    const { result, requests } = renderList(
      serving([announcement({ id: 3 }), closure({ id: 1 }), announcement({ id: 2 })]),
    );

    // No count is said until the summary answers.
    expect(result.current.list.tabs.map((tab) => tab.count)).toEqual([null, null, null]);
    await waitFor(() => {
      expect(result.current.list.tabs).toEqual([
        { value: 'RUNNING', label: 'Active', count: 2 },
        { value: 'UPCOMING', label: 'Scheduled', count: 1 },
        { value: 'ENDED', label: 'Ended', count: 7 },
      ]);
    });
    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });
    expect(result.current.list.cards.map((card) => card.id)).toEqual([3, 1, 2]);
    expect(result.current.list.cards[1]?.type).toEqual({
      label: 'Temporary closure',
      tone: 'warning',
    });
    expect(requests.find(({ url }) => url === LIST)?.params).toEqual({
      state: 'RUNNING',
      page: 1,
      limit: 20,
    });
  });

  it('reads the tab and the page from the address, and writes the tab chosen there', async () => {
    const { result, requests } = renderList(serving(), { path: '/p?state=ended&page=2' });

    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });
    expect(result.current.list.tab).toBe('ENDED');
    expect(requests.find(({ url }) => url === LIST)?.params).toEqual({
      state: 'ENDED',
      page: 2,
      limit: 20,
    });

    act(() => {
      result.current.list.choose('UPCOMING');
    });
    expect(result.current.location.search).toBe('?state=upcoming');
    await waitFor(() => {
      expect(requests.filter(({ url }) => url === LIST).at(-1)?.params).toEqual({
        state: 'UPCOMING',
        page: 1,
        limit: 20,
      });
    });
    expect(result.current.list.tab).toBe('UPCOMING');
  });

  it('is loading, then failed with its reference and a retry', async () => {
    let answer: FakeAnswer = refused(403, { type: 'forbidden' });
    const { result } = renderList((url) =>
      url.endsWith('/summary') ? ok(announcementsSummary()) : answer,
    );

    expect(result.current.list.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.list.state).toBe('failed');
    });
    expect(result.current.list.failure.title).toBe('We couldn’t load the announcements');
    expect(result.current.list.failure.reference).toMatch(/req-1/);

    answer = announcementsPage([announcement()]);
    act(() => {
      result.current.list.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });
  });

  it('is empty in its own words on each tab', async () => {
    const running = renderList(serving([]));
    await waitFor(() => {
      expect(running.result.current.list.state).toBe('empty');
    });
    expect(running.result.current.list.empty).toEqual({
      title: 'No active announcements',
      text: 'Announce a closure, an outage, an offer or an event for visitors to see on the space page.',
    });
    running.unmount();

    const ended = renderList(serving([]), { path: '/p?state=ended' });
    await waitFor(() => {
      expect(ended.result.current.list.state).toBe('empty');
    });
    expect(ended.result.current.list.empty.title).toBe('No ended announcements');
  });

  it('draws the pages only past one page', async () => {
    const one = renderList(serving([announcement()], { total: 20 }));
    await waitFor(() => {
      expect(one.result.current.list.state).toBe('ready');
    });
    expect(one.result.current.list.pagination).toBeNull();
    one.unmount();

    const two = renderList(serving([announcement()], { total: 21 }));
    await waitFor(() => {
      expect(two.result.current.list.state).toBe('ready');
    });
    expect(two.result.current.list.pagination?.summary).toBe('Page 1 of 2');
  });

  it('keeps the cards over a failed refresh, and keeps them busy while another tab loads', async () => {
    let answer: Answer = serving();
    const { result, client } = renderList((url) => answer(url));
    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });

    answer = (url) =>
      url.endsWith('/summary') ? ok(announcementsSummary()) : refused(403, { type: 'forbidden' });
    await act(async () => {
      await client.refetchQueries();
    });
    await waitFor(() => {
      expect(result.current.list.refreshFailure).toBe(
        'We couldn’t refresh; showing the last list.',
      );
    });
    expect(result.current.list.state).toBe('ready');

    answer = () => new Promise<FakeAnswer>(() => undefined);
    act(() => {
      result.current.list.choose('ENDED');
    });
    await waitFor(() => {
      expect(result.current.list.busy).toBe(true);
    });
    expect(result.current.list.cards).toHaveLength(1);
  });

  it('says a closure’s extension line: the owner’s on one not started, reception’s on one started', async () => {
    const rows = [
      closure({ id: 1, state: 'UPCOMING' }),
      closure({ id: 2 }),
      closure({
        id: 3,
        extension: {
          days: 3,
          subscriptions: 4,
          appliedAt: '2026-10-21T08:00:00.000Z',
          appliedBy: { id: 1, name: 'Sara' },
        },
      }),
      announcement({ id: 4 }),
    ];
    const owner = renderList(serving(rows));
    await waitFor(() => {
      expect(owner.result.current.list.state).toBe('ready');
    });
    expect(owner.result.current.list.cards.map((card) => card.closureLine)).toEqual([
      'Subscriptions can be extended once the closure has started.',
      null,
      null,
      null,
    ]);
    owner.unmount();

    const reception = renderList(serving(rows), { owner: false });
    await waitFor(() => {
      expect(reception.result.current.list.state).toBe('ready');
    });
    expect(reception.result.current.list.cards.map((card) => card.closureLine)).toEqual([
      null,
      'The owner extends subscriptions once the closure has started.',
      null,
      null,
    ]);
  });
});
