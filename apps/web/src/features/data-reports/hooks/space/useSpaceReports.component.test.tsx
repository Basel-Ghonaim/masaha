import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportsPage, spaceReport } from '../../../../test/dataReport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useSpaceReports } from './useSpaceReports';

/** The owner's reports of space 7, at `/page` with `search`; `result.current` holds the latest view. */
function renderReports(answer: () => FakeAnswer | Promise<FakeAnswer>, search = '') {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const result = { current: undefined as unknown as ReturnType<typeof useSpaceReports> };
  function Probe() {
    result.current = useSpaceReports(7);
    return null;
  }
  const router = createMemoryRouter([{ path: '/page', element: <Probe /> }], {
    initialEntries: [`/page${search}`],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { result, router, client, requests };
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

describe('useSpaceReports', () => {
  it('says «A visitor» for every report, never a name, and the day only', async () => {
    // A reporter's name the answer must never carry: the view shows none even if it did.
    const leaked = { ...spaceReport({ id: 42 }), reporter: { id: 9, name: 'Huda Saleh' } };
    const { result, requests } = renderReports(() =>
      reportsPage([spaceReport(), leaked, spaceReport({ id: 43, message: null })]),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    const { rows } = result.current;
    expect(rows.map((row) => row.byline)).toEqual([
      'A visitor · 21 October',
      'A visitor · 21 October',
      'A visitor · 21 October',
    ]);
    expect(rows.map((row) => row.day)).toEqual(['21 October', '21 October', '21 October']);
    expect(JSON.stringify(rows)).not.toContain('Huda');
    expect(JSON.stringify(rows)).not.toMatch(/00:30|21:30/);
    expect(rows[0]).toMatchObject({
      field: 'Opening hours',
      message: { text: 'The space opens at 9, not 8.', none: false },
      status: { label: 'New', tone: 'info' },
      open: { label: 'Open' },
    });
    expect(rows[2]?.message).toEqual({ text: 'The reporter wrote no details.', none: true });
    expect(result.current.count).toBe('3 reports');
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/data-reports']);
    expect(requests[0]?.params).toEqual({ page: 1, limit: 20 });
  });

  it('is loading, then failed with its reference and a retry', async () => {
    const { result } = renderReports(() => refused(403, { type: 'forbidden' }));

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.failure).toMatchObject({
      title: 'We couldn’t load the reports',
      message: 'You don’t have permission to do this.',
      reference: expect.stringContaining('req-1') as unknown,
      retryLabel: 'Try again',
    });
  });

  it('is empty with its line under «All», and matches nothing under a chip, with «Show all»', async () => {
    const { result, router, requests } = renderReports(() => reportsPage([]), '?status=open');

    await waitFor(() => {
      expect(result.current.state).toBe('noMatch');
    });
    expect(requests[0]?.params).toEqual({ status: 'OPEN', page: 1, limit: 20 });
    expect(result.current.empty).toMatchObject({
      title: 'No reports match the filters',
      text: null,
      showAll: { label: 'Show all' },
    });

    act(() => {
      result.current.empty.showAll?.run();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('empty');
    });
    expect(router.state.location.search).toBe('');
    expect(result.current.empty).toEqual({
      title: 'No reports',
      text: 'When a visitor reports wrong information, it shows up here.',
      showAll: null,
    });
  });

  it('keeps the chip in the address, replacing it and returning to the first page', async () => {
    const { result, router, requests } = renderReports(
      () => reportsPage([spaceReport()], { total: 30, currentPage: 2 }),
      '?page=2',
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.chips).toMatchObject({
      label: 'Filter by status',
      value: 'all',
      options: [
        { value: 'all', label: 'All' },
        { value: 'open', label: 'New' },
        { value: 'decided', label: 'Reviewed' },
      ],
    });

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

    act(() => {
      result.current.showDecided();
    });
    expect(router.state.location.search).toBe('?status=decided');
  });

  it('opens a report in the sheet, as the latest list has it', async () => {
    let decided = false;
    const { result, client } = renderReports(() =>
      reportsPage([
        decided
          ? spaceReport({
              status: 'RESOLVED',
              decision: {
                status: 'RESOLVED',
                at: '2026-10-27T09:00:00.000Z',
                note: null,
                repliedBy: 'SPACE',
              },
            })
          : spaceReport(),
      ]),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.sheet).toBeNull();
    act(() => {
      result.current.rows[0]?.open.run();
    });
    expect(result.current.sheet).toEqual({ audience: 'owner', spaceId: 7, report: spaceReport() });

    decided = true;
    await act(() => client.invalidateQueries({ queryKey: ['space', 7, 'dataReports'] }));
    await waitFor(() => {
      expect(result.current.sheet?.report.status).toBe('RESOLVED');
    });

    act(() => {
      result.current.close();
    });
    expect(result.current.sheet).toBeNull();
  });
});
