import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useUsersFilters } from './useUsersFilters';

/** The filters, on a page at `path`, with where the address stands and how it got there. */
function renderFilters(path: string, options: Parameters<typeof useUsersFilters>[0] = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => ({
      filters: useUsersFilters(options),
      location: useLocation(),
      how: useNavigationType(),
    }),
    { wrapper },
  );
}

describe('useUsersFilters', () => {
  it('chooses a state, replacing the address and returning to the first page', () => {
    const { result } = renderFilters('/owners?q=Rima&page=3');

    act(() => {
      result.current.filters.chooseState('suspended');
    });

    expect(result.current.location.search).toBe('?q=Rima&state=suspended');
    expect(result.current.how).toBe('REPLACE');
    expect(result.current.filters.request).toEqual({ q: 'Rima', state: 'suspended', page: 1 });
  });

  it('chooses a role, replacing the address and returning to the first page', () => {
    const { result } = renderFilters('/users?q=Rima&page=3');

    act(() => {
      result.current.filters.chooseRole('admin');
    });

    expect(result.current.location.search).toBe('?q=Rima&role=admin');
    expect(result.current.how).toBe('REPLACE');
    expect(result.current.filters.request).toEqual({ q: 'Rima', role: 'admin', page: 1 });
    expect(result.current.filters.anyApplied).toBe(true);

    act(() => {
      result.current.filters.chooseRole(undefined);
    });

    expect(result.current.location.search).toBe('?q=Rima');
  });

  it('with its role fixed, never reads a role from the address, writes one, or counts it as a filter', () => {
    const { result } = renderFilters('/owners?role=admin&page=2', { fixedRole: 'owner' });

    expect(result.current.filters.request).toEqual({ role: 'owner', page: 2 });
    expect(result.current.filters.anyApplied).toBe(false);

    act(() => {
      result.current.filters.chooseState('active');
    });

    expect(result.current.location.search).toBe('?state=active');
    expect(result.current.filters.request).toEqual({ state: 'active', role: 'owner', page: 1 });

    act(() => {
      result.current.filters.chooseRole('admin');
    });

    expect(result.current.location.search).toBe('?state=active');
  });

  it('clears the search and the state at once', () => {
    const { result } = renderFilters('/owners?q=Rima&state=active&page=2');
    expect(result.current.filters.anyApplied).toBe(true);

    act(() => {
      result.current.filters.clearAll();
    });

    expect(result.current.location.search).toBe('');
    expect(result.current.filters.search.text).toBe('');
    expect(result.current.filters.anyApplied).toBe(false);
  });
});
