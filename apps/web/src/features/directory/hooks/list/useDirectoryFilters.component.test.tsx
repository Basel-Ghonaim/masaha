import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../../test/startPreferences';
import { useDirectoryFilters } from './useDirectoryFilters';

/** The filters, on the directory at `path`, with where the address stands and a way to move it. */
function renderFilters(path = '/spaces') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => ({ filters: useDirectoryFilters(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDirectoryFilters', () => {
  it('a filter replaces the address and returns to the first page', () => {
    const { result } = renderFilters('/spaces');
    act(() => {
      void result.current.navigate('/spaces?verified=1&page=3');
    });
    expect(result.current.filters.request).toEqual({ limit: 20, verified: true, page: 3 });

    act(() => {
      result.current.filters.apply({ sort: 'name' });
    });
    expect(result.current.location.search).toBe('?verified=1&sort=name');
    expect(result.current.filters.request).toEqual({
      limit: 20,
      verified: true,
      sort: 'name',
      lang: 'ar',
    });

    act(() => {
      void result.current.navigate(-1);
    });
    expect(result.current.location.search).toBe('');
  });

  it('the search reaches the address only once typing has paused', () => {
    vi.useFakeTimers();
    const { result } = renderFilters('/spaces?page=2');

    act(() => {
      result.current.filters.search.change('Fo');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      result.current.filters.search.change('Focus');
    });
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current.location.search).toBe('?page=2');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.location.search).toBe('?q=Focus');
    expect(result.current.filters.anyApplied).toBe(true);
  });

  it('keeps a search of diacritics only in the field, says so, and leaves it off the address', () => {
    vi.useFakeTimers();
    const { result } = renderFilters('/spaces?q=Focus');

    act(() => {
      result.current.filters.search.change('َِ');
    });
    expect(result.current.filters.search.refused).toBe(true);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.location.search).toBe('');
    expect(result.current.filters.search.text).toBe('َِ');
    expect(result.current.filters.request).toEqual({ limit: 20 });
  });

  it('clears every filter and the search, and words each page’s address with the filters kept', () => {
    const { result } = renderFilters('/spaces?q=Focus&area=3&verified=1&page=2');

    expect(result.current.filters.searchOf(3)).toBe('?q=Focus&area=3&verified=1&page=3');
    expect(result.current.filters.searchOf(1)).toBe('?q=Focus&area=3&verified=1');

    act(() => {
      result.current.filters.clearAll();
    });
    expect(result.current.location.search).toBe('');
    expect(result.current.filters.search.text).toBe('');
    expect(result.current.filters.anyApplied).toBe(false);
  });

  it('counts the filters in force, not their values, and clears them keeping the search and the order', () => {
    const { result } = renderFilters(
      '/spaces?q=Hub&area=2,3,4&period=DAY&min=10&max=30&verified=1&friday=1&sort=name',
    );
    expect(result.current.filters.applied).toBe(4);

    act(() => {
      result.current.filters.clearFilters();
    });
    expect(result.current.location.search).toBe('?q=Hub&sort=name');
    expect(result.current.filters.applied).toBe(0);
    expect(result.current.filters.anyApplied).toBe(true);
  });
});
