import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminReport, reportsPage } from '../../../../test/dataReport';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useAdminReports } from './useAdminReports';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | undefined) => line?.replace(/[⁦-⁩]/g, '');

/** The editor's link the page gives: the space and, when given, the field's section. */
const editorLink = (spaceId: number, field?: string) =>
  `/admin/spaces/${String(spaceId)}${field === undefined ? '' : `#${field}`}`;

/** The admin's reports at `/reports` with `search`; `result.current` holds the latest view. */
function renderReports(answer: () => FakeAnswer | Promise<FakeAnswer>, search = '') {
  const requests = fakeTransport(answer);
  const result = { current: undefined as unknown as ReturnType<typeof useAdminReports> };
  function Probe() {
    result.current = useAdminReports({ editorLink });
    return null;
  }
  const router = createMemoryRouter([{ path: '/reports', element: <Probe /> }], {
    initialEntries: [`/reports${search}`],
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { result, router, requests };
}

const VERIFIED = adminReport({
  id: 42,
  field: 'PRICES',
  space: { id: 3, slug: 'nook', nameEn: 'Nook', nameAr: null, verified: true },
  reporter: { id: 10, name: 'Omar Nasser' },
});

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useAdminReports', () => {
  it('names the reporter and who handles each report; a verified space’s opens read-only', async () => {
    const { result, requests } = renderReports(() => reportsPage([adminReport(), VERIFIED]));

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(requests.map(({ url }) => url)).toEqual(['/admin/data-reports']);
    expect(requests[0]?.params).toEqual({ page: 1, limit: 20 });
    const [unverified, verified] = result.current.rows;
    expect(unverified).toMatchObject({
      space: { name: { text: 'Focus Hub' }, link: '/admin/spaces/7' },
      reporter: 'Huda Saleh',
      handledBy: { label: 'Admin', tone: 'info' },
      open: { label: 'Open' },
    });
    expect(heard(unverified?.byline)).toBe('Huda Saleh · 21 October');
    expect(verified).toMatchObject({
      field: 'Prices',
      reporter: 'Omar Nasser',
      handledBy: { label: 'Owner', tone: 'neutral' },
      open: { label: 'View' },
    });

    act(() => {
      verified?.open.run();
    });
    expect(result.current.sheet).toEqual({ audience: 'admin', report: VERIFIED });
    expect(result.current.editLinkOf(VERIFIED)).toBe('/admin/spaces/3');
    act(() => {
      unverified?.open.run();
    });
    expect(result.current.sheet?.report.id).toBe(41);
    expect(result.current.editLinkOf(adminReport())).toBe('/admin/spaces/7#HOURS');
  });

  it('shows the space and the field in force as removable tags, each removal replacing the address', async () => {
    const { result, router, requests } = renderReports(
      () => reportsPage([adminReport()]),
      '?status=open&field=HOURS&space=7&page=2',
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(requests[0]?.params).toEqual({
      status: 'OPEN',
      field: 'HOURS',
      spaceId: 7,
      page: 2,
      limit: 20,
    });
    expect(result.current.filters.space.chosenName).toEqual({ text: 'Focus Hub' });
    expect(result.current.tags.map((tag) => [heard(tag.label), tag.removeLabel])).toEqual([
      ['Space: Focus Hub', 'Remove the space filter'],
      ['Field: Opening hours', 'Remove the field filter'],
    ]);
    expect(result.current.clear?.label).toBe('Clear filters');
    expect(result.current.filters.sheet.label).toBe('2 filters applied');

    act(() => {
      result.current.tags[0]?.remove();
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=open&field=HOURS');
    });
    expect(router.state.historyAction).toBe('REPLACE');
    await waitFor(() => {
      expect(result.current.tags.map((tag) => tag.key)).toEqual(['field']);
    });

    act(() => {
      result.current.clear?.run();
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=open');
    });
    await waitFor(() => {
      expect(result.current.tags).toEqual([]);
    });
    expect(result.current.clear).toBeNull();
  });

  it('takes off the space and the field together with «Clear filters», the chip kept', async () => {
    const { result, router } = renderReports(
      () => reportsPage([adminReport()]),
      '?status=decided&field=PRICES&space=7&page=2',
    );

    await waitFor(() => {
      expect(result.current.tags).toHaveLength(2);
    });
    act(() => {
      result.current.clear?.run();
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=decided');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('says «A chosen space» for a space no report on the page names', async () => {
    const { result } = renderReports(() => reportsPage([]), '?space=12');

    await waitFor(() => {
      expect(result.current.state).toBe('noMatch');
    });
    expect(heard(result.current.tags[0]?.label)).toBe('Space: A chosen space');
    expect(result.current.empty).toMatchObject({
      title: 'No reports match the filters',
      showAll: { label: 'Show all' },
    });
  });

  it('chooses a space and a field, each from the first page', async () => {
    const { result, router } = renderReports(() => reportsPage([adminReport()]), '?page=3');

    await waitFor(() => {
      expect(result.current.state).not.toBe('loading');
    });
    act(() => {
      result.current.filters.space.choose(7);
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?space=7');
    });
    act(() => {
      result.current.filters.field.choose('AMENITIES');
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?field=AMENITIES&space=7');
    });
    act(() => {
      result.current.filters.field.choose('all');
    });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?space=7');
    });
  });
});
