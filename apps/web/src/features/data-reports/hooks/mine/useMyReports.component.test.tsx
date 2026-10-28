import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { myReport, reportsPage } from '../../../../test/dataReport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useMyReports } from './useMyReports';

const spaceLink = (slug: string) => `/spaces/${slug}`;

/** «بلاغاتي» at `/me/reports` with `search`; `result.current` holds the latest view. */
function renderMine(answer: () => FakeAnswer | Promise<FakeAnswer>, search = '') {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const result = { current: undefined as unknown as ReturnType<typeof useMyReports> };
  function Probe() {
    result.current = useMyReports({ spaceLink });
    return null;
  }
  const router = createMemoryRouter([{ path: '/me/reports', element: <Probe /> }], {
    initialEntries: [`/me/reports${search}`],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { result, router, requests };
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useMyReports', () => {
  it('links a listed space, names one that left as text with its line, and labels each reply by who replied', async () => {
    const { result, requests } = renderMine(() =>
      reportsPage([
        myReport(),
        myReport(
          {
            id: 42,
            field: 'PRICES',
            status: 'RESOLVED',
            decision: {
              status: 'RESOLVED',
              at: '2026-10-22T08:00:00.000Z',
              note: 'Fixed.',
              repliedBy: 'SPACE',
            },
          },
          { id: 8, slug: 'old-hub', nameEn: 'Old Hub', nameAr: null, listed: false },
        ),
        myReport({
          id: 43,
          message: null,
          status: 'DISMISSED',
          decision: {
            status: 'DISMISSED',
            at: '2026-10-22T08:00:00.000Z',
            note: 'The hours are right.',
            repliedBy: 'MASAHA',
          },
        }),
      ]),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    const [listed, gone, team] = result.current.cards;
    expect(listed).toMatchObject({
      space: { name: { text: 'Masaha Hub' }, link: '/spaces/masaha-hub', gone: null },
      meta: 'Opening hours · Sent 21 October',
      status: { label: 'In review', tone: 'info' },
      message: { text: 'The space opens at 9, not 8.', toggle: null },
      reply: null,
    });
    expect(gone).toMatchObject({
      space: {
        name: { text: 'Old Hub' },
        link: null,
        gone: 'This space is no longer listed in the directory',
      },
      meta: 'Prices · Sent 21 October',
      status: { label: 'Corrected', tone: 'success' },
      reply: { label: 'Reply from the space', text: 'Fixed.' },
    });
    expect(team).toMatchObject({
      message: null,
      status: { label: 'Not accepted', tone: 'neutral' },
      reply: { label: 'Reply from our team', text: 'The hours are right.' },
    });
    expect(result.current.count).toBe('3 reports');
    expect(requests.map(({ url }) => url)).toEqual(['/me/reports']);
    expect(requests[0]?.params).toEqual({ page: 1, limit: 20 });
  });

  it('keeps the chip in the address, replacing it and returning to the first page', async () => {
    const { result, router, requests } = renderMine(
      () => reportsPage([myReport()], { total: 30, currentPage: 2 }),
      '?page=2',
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(requests[0]?.params).toEqual({ page: 2, limit: 20 });
    expect(result.current.chips.options.map((option) => option.label)).toEqual([
      'All',
      'In review',
      'Reviewed',
    ]);

    act(() => {
      result.current.chips.choose('decided');
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=decided');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    await waitFor(() => {
      expect(requests.at(-1)?.params).toEqual({ status: 'DECIDED', page: 1, limit: 20 });
    });
  });

  it('says none is sent yet with «Browse spaces», and none under a chip without it', async () => {
    const { result, router } = renderMine(() => reportsPage([]), '?status=open');

    await waitFor(() => {
      expect(result.current.state).toBe('none');
    });
    expect(result.current.empty).toEqual({ title: 'No reports here', text: null, browse: null });

    act(() => {
      result.current.chips.choose('all');
    });
    await waitFor(() => {
      expect(result.current.state).toBe('empty');
    });
    expect(router.state.location.search).toBe('');
    expect(result.current.empty).toEqual({
      title: 'You haven’t sent any reports yet',
      text: 'If you see wrong information on a space’s page, report it from there.',
      browse: 'Browse spaces',
    });
  });

  it('is loading, then failed with its reference and a retry', async () => {
    const { result } = renderMine(() => refused(403, { type: 'forbidden' }));

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.failure).toMatchObject({
      title: 'We couldn’t load your reports',
      reference: expect.stringContaining('req-1') as unknown,
      retryLabel: 'Try again',
    });
  });
});
