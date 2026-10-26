import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCustomersFilters } from './useCustomersFilters';

/** The filters, on a page at `path` entered from another page, with the address and a way back. */
function renderFilters(path: string, owner = true) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/before', path]} initialIndex={1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({
      filters: useCustomersFilters(owner),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    { wrapper },
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useCustomersFilters', () => {
  it('replaces the address with each filter chosen, back on the first page', () => {
    const { result } = renderFilters('/c?q=Sa&page=3');

    act(() => {
      result.current.filters.choose.status('EXPIRED');
    });
    expect(result.current.location.search).toBe('?q=Sa&status=EXPIRED');
    act(() => {
      result.current.filters.choose.kind('PACKAGE');
      result.current.filters.choose.payment('OWES');
    });
    expect(result.current.location.search).toBe('?q=Sa&status=EXPIRED&kind=PACKAGE&payment=OWES');
    expect(result.current.filters.applied).toBe(2);

    act(() => {
      result.current.filters.clearFilters();
    });
    // The sheet's two filters off; the search and the status chip stay.
    expect(result.current.location.search).toBe('?q=Sa&status=EXPIRED');

    // Replaced, not pushed: Back leaves the list.
    act(() => {
      void result.current.navigate(-1);
    });
    expect(result.current.location.pathname).toBe('/before');
  });

  it('writes the search once typing pauses, back on the first page', () => {
    vi.useFakeTimers();
    const { result } = renderFilters('/c?page=2');

    act(() => {
      result.current.filters.search.change('Sara');
    });
    expect(result.current.location.search).toBe('?page=2');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.location.search).toBe('?q=Sara');
    expect(result.current.filters.query).toEqual({ q: 'Sara', page: 1, limit: 20 });
  });

  it('asks reception for no archived customers, and gives each page its own address', () => {
    const { result } = renderFilters('/c?status=ARCHIVED&kind=NONE', false);

    expect(result.current.filters.query).toEqual({ kind: 'NONE', page: 1, limit: 20 });
    expect(result.current.filters.searchOf(2)).toBe('?kind=NONE&page=2');
    expect(result.current.filters.searchOf(1)).toBe('?kind=NONE');
  });
});
