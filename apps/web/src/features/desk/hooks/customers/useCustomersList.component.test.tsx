import type { CustomerRow } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { customerRow } from '../../../../test/deskCustomer';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useCustomersList } from './useCustomersList';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** Page `current` of `totalPages` of the customers list, as the server answers it. */
function customersAt(rows: CustomerRow[], current = 1, totalPages = 1): FakeAnswer {
  return {
    status: 200,
    data: {
      success: true,
      data: rows,
      meta: {
        currentPage: current,
        limit: 20,
        totalPages,
        totalRecords: totalPages * 20,
        hasNextPage: current < totalPages,
        hasPreviousPage: current > 1,
      },
    },
  };
}

function renderList(
  path: string,
  answer: (request: Request) => FakeAnswer | Promise<FakeAnswer>,
  owner = true,
) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const view = renderHook(
    () => ({ list: useCustomersList(7, { owner }), navigate: useNavigate() }),
    { wrapper },
  );
  return { ...view, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useCustomersList', () => {
  it('loads, then shows the rows with their count', async () => {
    const { result, requests } = renderList('/c', () => customersAt([customerRow()]));

    expect(result.current.list.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });
    expect(result.current.list.rows.map((row) => row.card.name)).toEqual(['Sara Khalid']);
    expect(result.current.list.count).toBe('20 customers');
    expect(requests[0]?.params).toEqual({ page: 1, limit: 20 });
  });

  it('says a failed load with its reference and a retry', async () => {
    let fails = true;
    const { result } = renderList('/c', () =>
      fails ? refused(404, { type: 'not_found' }) : customersAt([customerRow()]),
    );

    await waitFor(() => {
      expect(result.current.list.state).toBe('failed');
    });
    expect(result.current.list.failure.title).toBe('We couldn’t load the customers');
    expect(result.current.list.failure.reference).toContain('req-1');
    fails = false;
    act(() => {
      result.current.list.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });
  });

  it.each([
    ['/c', 'empty', 'No customers yet'],
    ['/c?q=Zed', 'noMatch', 'No customers match'],
    ['/c?kind=CUSTOM', 'noMatch', 'No customers match'],
    ['/c?status=ARCHIVED', 'archivedEmpty', 'No archived customers'],
  ])('at %s with no rows, says %s', async (path, state, title) => {
    const { result } = renderList(path, () => customersAt([], 1, 0));

    await waitFor(() => {
      expect(result.current.list.state).toBe(state);
    });
    expect(result.current.list.empty.title).toBe(title);
  });

  it('keeps the rows shown, marked busy, while the next page loads', async () => {
    const next = deferred<FakeAnswer>();
    const { result } = renderList('/c', (request) =>
      (request.params as { page: number }).page === 2
        ? next.promise
        : customersAt([customerRow()], 1, 2),
    );
    await waitFor(() => {
      expect(result.current.list.state).toBe('ready');
    });

    act(() => {
      void result.current.navigate('/c?page=2');
    });
    await waitFor(() => {
      expect(result.current.list.busy).toBe(true);
    });
    expect(result.current.list.state).toBe('ready');
    expect(result.current.list.rows.map((row) => row.card.name)).toEqual(['Sara Khalid']);

    act(() => {
      next.resolve(customersAt([customerRow({ id: 9, name: 'Omar' })], 2, 2));
    });
    await waitFor(() => {
      expect(result.current.list.busy).toBe(false);
    });
    expect(result.current.list.rows.map((row) => row.card.name)).toEqual(['Omar']);
  });
});
