import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useOwnersList } from './useOwnersList';

const RIMA: AdminUserRow = {
  id: 5,
  name: 'Rima',
  email: 'rima@example.com',
  role: 'OWNER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [{ id: 7, nameEn: 'Focus Hub', nameAr: null }],
  receptionSpaces: [],
};

/** A page of `rows`, the only one. */
function page(rows: AdminUserRow[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 20,
    totalPages: rows.length > 0 ? 1 : 0,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** The owners list at `path`, the server answering with `rows`. */
function renderList(path: string, rows: AdminUserRow[]) {
  const requests = fakeTransport(() => page(rows));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useOwnersList(), { wrapper }), requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useOwnersList', () => {
  it('asks for the owners only, with the address’s search, state and page', async () => {
    const { result, requests } = renderList('/owners?q=Rima&state=active&page=2', [RIMA]);

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(requests[0]).toMatchObject({ method: 'get', url: '/admin/users' });
    expect(requests[0]?.params).toEqual({ q: 'Rima', state: 'active', page: 2, role: 'owner' });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.filters.state.value).toBe('active');
  });

  it('is empty with no filter, and no match with one', async () => {
    const empty = renderList('/owners', []);
    await waitFor(() => {
      expect(empty.result.current.status).toBe('empty');
    });
    empty.unmount();
    restoreTransport();

    const none = renderList('/owners?state=suspended', []);
    await waitFor(() => {
      expect(none.result.current.status).toBe('noMatch');
    });
  });
});
