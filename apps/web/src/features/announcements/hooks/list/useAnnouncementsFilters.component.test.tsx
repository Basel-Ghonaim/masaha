import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useAnnouncementsFilters } from './useAnnouncementsFilters';

/** The tab and page, on a page at `path` entered from another page, with the address and a way back. */
function renderFilters(path: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/before', path]} initialIndex={1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({
      filters: useAnnouncementsFilters(),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    { wrapper },
  );
}

describe('useAnnouncementsFilters', () => {
  it('replaces the address with the tab chosen, back on its first page; Back leaves the list', () => {
    const { result } = renderFilters('/p?page=3');
    expect(result.current.filters.filters).toEqual({ state: 'RUNNING', page: 3 });

    act(() => {
      result.current.filters.choose('ENDED');
    });
    expect(result.current.location.search).toBe('?state=ended');
    act(() => {
      result.current.filters.choose('RUNNING');
    });
    expect(result.current.location.search).toBe('');

    act(() => {
      void result.current.navigate(-1);
    });
    expect(result.current.location.pathname).toBe('/before');
  });

  it('links each page with the tab kept, and replaces a page past the last', () => {
    const { result } = renderFilters('/p?state=upcoming&page=4');

    expect(result.current.filters.searchOf(2)).toBe('?state=upcoming&page=2');
    expect(result.current.filters.searchOf(1)).toBe('?state=upcoming');
    act(() => {
      result.current.filters.replacePage(2);
    });
    expect(result.current.location.search).toBe('?state=upcoming&page=2');
  });
});
