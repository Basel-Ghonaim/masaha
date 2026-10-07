import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useAdminSpacesList } from './useAdminSpacesList';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const FOCUS: AdminSpaceRow = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  state: 'verified',
  owners: [{ id: 3, name: 'Ahmad' }],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00Z',
};

/** A page of `rows` with its meta: `page` of `totalPages`, `totalRecords` in all. */
function page(
  rows: AdminSpaceRow[],
  { currentPage = 1, totalPages = 1, totalRecords = rows.length }: Partial<PaginationMeta> = {},
): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage,
    limit: 20,
    totalPages,
    totalRecords,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** The list at `path`, the server answering each request with `answer`; the address beside it. */
function renderList(
  path: string,
  answer: (request: Request, index: number) => FakeAnswer | Promise<FakeAnswer>,
) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const rendered = renderHook(
    () => ({ list: useAdminSpacesList(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
  return { ...rendered, requests, client };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAdminSpacesList', () => {
  it('loads, then shows the page’s rows worded, and the count the filters keep', async () => {
    const { result } = renderList('/s', () => page([FOCUS], { totalRecords: 1 }));

    expect(result.current.list.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.list.status).toBe('ready');
    });
    expect(result.current.list.rows.map(({ name, area }) => [name.text, area])).toEqual([
      ['Focus Hub', 'Al-Rimal'],
    ]);
    expect(result.current.list.summary).toBe('Spaces: 1');
    expect(result.current.list.pagination).toBeNull();
  });

  it('says there are no spaces yet when nothing is filtered', async () => {
    const { result } = renderList('/s', () => page([]));

    await waitFor(() => {
      expect(result.current.list.status).toBe('empty');
    });
    expect(result.current.list.empty).toEqual({
      title: 'No spaces yet',
      description: 'Spaces appear here once they are added.',
    });
  });

  it('says no space matches when a filter is applied, and clears them all', async () => {
    const { result } = renderList('/s?q=Palm&stale=true', () => page([]));

    await waitFor(() => {
      expect(result.current.list.status).toBe('noMatch');
    });
    expect(result.current.list.noMatch.title).toBe('No spaces match the filters');

    act(() => {
      result.current.list.noMatch.clear();
    });
    expect(result.current.location.search).toBe('');
  });

  it('shows a failure to load with its reference, and tries again', async () => {
    const { result, requests } = renderList('/s', (_request, index) =>
      index === 0 ? refused(403, { type: 'forbidden' }) : page([FOCUS]),
    );

    await waitFor(() => {
      expect(result.current.list.status).toBe('error');
    });
    expect(result.current.list.failure).toMatchObject({
      title: 'We couldn’t load the spaces',
      message: 'You don’t have permission to do this.',
      reference: expect.stringContaining('req-1') as string,
      blocked: false,
    });

    act(() => {
      result.current.list.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.list.status).toBe('ready');
    });
    expect(requests).toHaveLength(2);
  });

  it('holds Try again while a 429 counts down', async () => {
    const { result } = renderList('/s', () =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    await waitFor(() => {
      expect(result.current.list.status).toBe('error');
    });
    expect(result.current.list.failure.blocked).toBe(true);
  });

  it('keeps the rows already shown when a later fetch fails', async () => {
    const { result, client } = renderList('/s', (_request, index) =>
      index === 0 ? page([FOCUS]) : refused(403, { type: 'forbidden' }),
    );
    await waitFor(() => {
      expect(result.current.list.status).toBe('ready');
    });

    await act(() => client.refetchQueries());
    // The failure reaches the list on a later tick than the one the refetch settles on.
    await waitFor(() => {
      expect(client.getQueryCache().getAll()[0]?.state.status).toBe('error');
    });

    expect(result.current.list.status).toBe('ready');
    expect(result.current.list.rows).toHaveLength(1);
  });

  it('keeps the rows and the pages while the next page loads, the list marked busy', async () => {
    const PALM = { ...FOCUS, id: 9, nameEn: 'Palm Hub' };
    const next = deferred<FakeAnswer>();
    const { result } = renderList('/s', (request) =>
      (request.params as { page: number }).page === 2
        ? next.promise
        : page([FOCUS], { currentPage: 1, totalPages: 2, totalRecords: 21 }),
    );
    await waitFor(() => {
      expect(result.current.list.status).toBe('ready');
    });
    expect(result.current.list.busy).toBe(false);

    act(() => {
      void result.current.navigate('/s?page=2');
    });

    await waitFor(() => {
      expect(result.current.list.busy).toBe(true);
    });
    expect(result.current.list.status).toBe('ready');
    expect(result.current.list.rows.map(({ name }) => name.text)).toEqual(['Focus Hub']);
    expect(result.current.list.pagination).not.toBeNull();

    next.resolve(page([PALM], { currentPage: 2, totalPages: 2, totalRecords: 21 }));
    await waitFor(() => {
      expect(result.current.list.busy).toBe(false);
    });
    expect(result.current.list.rows.map(({ name }) => name.text)).toEqual(['Palm Hub']);
  });

  it('opens the last page in place of a page past it, as after deleting its last row', async () => {
    const { result, requests } = renderList('/s?status=hidden&page=3', (request) =>
      (request.params as { page: number }).page === 3
        ? page([], { currentPage: 3, totalPages: 2, totalRecords: 21 })
        : page([FOCUS], { currentPage: 2, totalPages: 2, totalRecords: 21 }),
    );

    // The empty page past the last is never shown as empty: the list waits for the last one.
    expect(result.current.list.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.location.search).toBe('?status=hidden&page=2');
    });
    await waitFor(() => {
      expect(result.current.list.status).toBe('ready');
    });
    expect(requests).toHaveLength(2);
  });

  it('offers the pages, each with its address, the current one marked', async () => {
    const { result } = renderList('/s?stale=true&page=2', () =>
      page([FOCUS], { currentPage: 2, totalPages: 3, totalRecords: 41 }),
    );

    await waitFor(() => {
      expect(result.current.list.pagination).not.toBeNull();
    });
    expect(result.current.list.pagination).toMatchObject({
      label: 'Pages of the spaces list',
      summary: 'Page 2 of 3',
      previous: { label: 'Previous', search: '?stale=true' },
      next: { label: 'Next', search: '?stale=true&page=3' },
      items: [
        { kind: 'page', page: 1, label: 'Page 1', search: '?stale=true', current: false },
        { kind: 'page', page: 2, label: 'Page 2', search: '?stale=true&page=2', current: true },
        { kind: 'page', page: 3, label: 'Page 3', search: '?stale=true&page=3', current: false },
      ],
    });
  });

  it('has no previous page on the first, nor a next on the last', async () => {
    const { result } = renderList('/s', () =>
      page([FOCUS], { currentPage: 1, totalPages: 2, totalRecords: 21 }),
    );

    await waitFor(() => {
      expect(result.current.list.pagination).not.toBeNull();
    });
    expect(result.current.list.pagination?.previous.search).toBeNull();
    expect(result.current.list.pagination?.next.search).toBe('?page=2');
  });

  it('offers every state as a filter, and the count of filters applied for the phone’s button', async () => {
    const { result } = renderList('/s?status=hidden&stale=true', () => page([FOCUS]));

    await waitFor(() => {
      expect(result.current.list.status).toBe('ready');
    });
    expect(result.current.list.filters.status).toMatchObject({
      label: 'Status',
      value: 'hidden',
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'verified', label: 'Verified' },
        { value: 'unverified', label: 'Unverified' },
        { value: 'hidden', label: 'Hidden' },
      ],
    });
    expect(result.current.list.filters.sheet).toMatchObject({
      text: 'Filters',
      label: 'Filters, 2 applied',
      count: 2,
    });

    act(() => {
      result.current.list.filters.status.choose('all');
    });
    expect(result.current.location.search).toBe('?stale=true');
  });
});
