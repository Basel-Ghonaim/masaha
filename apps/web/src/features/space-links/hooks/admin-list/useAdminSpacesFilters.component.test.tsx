import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAdminSpacesFilters } from './useAdminSpacesFilters';

/** The filters, on a page at `path`, with where the address stands and a way to move it. */
function renderFilters(path = '/dashboard/admin/spaces') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => ({ filters: useAdminSpacesFilters(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useAdminSpacesFilters', () => {
  it('reads the filters and the page from the address, and asks for them', () => {
    const { result } = renderFilters('/s?q=Hub&status=hidden&area=12&stale=true&page=2');

    expect(result.current.filters.request).toEqual({
      q: 'Hub',
      status: 'hidden',
      areaId: 12,
      stale: true,
      page: 2,
    });
    expect(result.current.filters.search.text).toBe('Hub');
  });

  it('asks for the first page of every space from a bare address', () => {
    const { result } = renderFilters('/s');

    expect(result.current.filters.request).toEqual({ page: 1 });
    expect(result.current.filters.applied).toBe(0);
    expect(result.current.filters.anyApplied).toBe(false);
  });

  it('writes each filter chosen to the address, back on the first page', () => {
    const { result } = renderFilters('/s?page=3');

    act(() => {
      result.current.filters.chooseStatus('hidden');
    });
    expect(result.current.location.search).toBe('?status=hidden');

    act(() => {
      result.current.filters.choosePlace({ governorateId: 2 });
    });
    expect(result.current.location.search).toBe('?status=hidden&governorate=2');

    act(() => {
      result.current.filters.chooseStale(true);
    });
    expect(result.current.location.search).toBe('?status=hidden&governorate=2&stale=true');
    expect(result.current.filters.applied).toBe(3);
  });

  it('writes an area in place of the governorate, and takes a filter off again', () => {
    const { result } = renderFilters('/s?governorate=2&status=verified&stale=true');

    act(() => {
      result.current.filters.choosePlace({ areaId: 12 });
    });
    expect(result.current.location.search).toBe('?status=verified&area=12&stale=true');

    act(() => {
      result.current.filters.chooseStatus(undefined);
      result.current.filters.chooseStale(false);
      result.current.filters.choosePlace(null);
    });
    expect(result.current.location.search).toBe('');
  });

  it('replaces the address rather than adding a step, so Back leaves the page', () => {
    const { result } = renderFilters('/s');
    act(() => {
      void result.current.navigate('/s?stale=true');
    });

    act(() => {
      result.current.filters.chooseStatus('verified');
    });
    act(() => {
      void result.current.navigate(-1);
    });

    expect(result.current.location.search).toBe('');
  });

  it('writes the search once typing has paused, back on the first page', () => {
    vi.useFakeTimers();
    const { result } = renderFilters('/s?page=2');

    act(() => {
      result.current.filters.search.change('Fo');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      result.current.filters.search.change(' Focus ');
    });
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current.location.search).toBe('?page=2');
    expect(result.current.filters.search.text).toBe(' Focus ');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.location.search).toBe('?q=Focus');
    expect(result.current.filters.anyApplied).toBe(true);
    // The field keeps what was typed: its spaces are the person's, the trimmed search the address's.
    expect(result.current.filters.search.text).toBe(' Focus ');
  });

  it('keeps a space typed before a pause, so the next word follows it', () => {
    vi.useFakeTimers();
    const { result } = renderFilters('/s');

    act(() => {
      result.current.filters.search.change('Gaza ');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.location.search).toBe('?q=Gaza');
    act(() => {
      result.current.filters.search.change(`${result.current.filters.search.text}C`);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.filters.search.text).toBe('Gaza C');
    expect(result.current.location.search).toBe('?q=Gaza+C');
  });

  it('takes the search off once the field is emptied', () => {
    vi.useFakeTimers();
    const { result } = renderFilters('/s?q=Focus');

    act(() => {
      result.current.filters.search.change('  ');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.location.search).toBe('');
  });

  it('keeps the search field in step with an address changed elsewhere', () => {
    const { result } = renderFilters('/s?q=Focus');

    act(() => {
      void result.current.navigate('/s?q=Palm');
    });

    expect(result.current.filters.search.text).toBe('Palm');
  });

  it('clears the filters in the phone’s sheet, keeping the search', () => {
    const { result } = renderFilters('/s?q=Hub&status=hidden&area=12&stale=true&page=2');

    act(() => {
      result.current.filters.clearFilters();
    });

    expect(result.current.location.search).toBe('?q=Hub');
  });

  it('clears every filter, the search included', () => {
    const { result } = renderFilters('/s?q=Hub&status=hidden&area=12&stale=true&page=2');

    act(() => {
      result.current.filters.clearAll();
    });

    expect(result.current.location.search).toBe('');
    expect(result.current.filters.search.text).toBe('');
  });

  it('gives the address of each page, with the filters kept', () => {
    const { result } = renderFilters('/s?status=hidden&page=2');

    expect(result.current.filters.searchOf(3)).toBe('?status=hidden&page=3');
    expect(result.current.filters.searchOf(1)).toBe('?status=hidden');
  });

  it('moves to another page in place, keeping the filters', () => {
    const { result } = renderFilters('/s?status=hidden&page=4');

    act(() => {
      result.current.filters.replacePage(2);
    });

    expect(result.current.location.search).toBe('?status=hidden&page=2');
  });
});
