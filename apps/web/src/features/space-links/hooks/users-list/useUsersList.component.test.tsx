import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminUserRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useUsersList } from './useUsersList';

const user = (row: Partial<AdminUserRow> & Pick<AdminUserRow, 'id' | 'name'>): AdminUserRow => ({
  email: `${row.name.toLowerCase()}@example.com`,
  role: 'USER',
  isSuspended: false,
  signIn: { password: true, google: false },
  joinedAt: '2026-09-01T08:00:00Z',
  spaces: [],
  receptionSpaces: [],
  ...row,
});

/** The signed-in admin (id 1), and another person. */
const SARA = user({ id: 1, name: 'Sara', role: 'ADMIN' });
const RIMA = user({ id: 5, name: 'Rima' });

/** A page of `rows`, the only one. */
function page(rows: AdminUserRow[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

/** The users list at `path`, the server answering with `rows`. */
function renderList(path: string, rows: AdminUserRow[]) {
  const requests = fakeTransport(() => page(rows));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { ...renderHook(() => useUsersList(), { wrapper }), requests };
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ id: 1, role: 'ADMIN' }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
});

describe('useUsersList', () => {
  it('asks for the address’s search, role, state and page', async () => {
    const { result, requests } = renderList('/users?q=Rima&role=admin&state=active&page=2', [SARA]);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(requests[0]).toMatchObject({ method: 'get', url: '/admin/users' });
    expect(requests[0]?.params).toEqual({ q: 'Rima', role: 'admin', state: 'active', page: 2 });
    expect(result.current.filters.role?.value).toBe('admin');
    expect(result.current.filters.role?.options.map((option) => option.label)).toEqual([
      'All',
      'User',
      'Owner',
      'Admin',
    ]);
  });

  it('marks the signed-in admin’s own row', async () => {
    const { result } = renderList('/users', [SARA, RIMA]);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.rows.map((row) => row.id === result.current.selfId)).toEqual([
      true,
      false,
    ]);
  });
});
