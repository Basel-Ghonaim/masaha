import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { useDirectoryFilters } from '../list/useDirectoryFilters';
import { useFiltersPanel } from './useFiltersPanel';

/** The filters' panel on the directory at `path`, with the address. */
function renderPanel(path = '/spaces') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const filters = useDirectoryFilters();
      return {
        panel: useFiltersPanel({
          filters: filters.filters,
          apply: filters.apply,
          applied: filters.applied,
          clear: filters.clearFilters,
          total: undefined,
        }),
        search: useLocation().search,
      };
    },
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

describe('useFiltersPanel', () => {
  it('clearing resets the price’s own state: a refused bound, a period chosen with no bound, and a bound still within its pause', () => {
    vi.useFakeTimers();
    stubScreenWidth(390);
    const { result } = renderPanel('/spaces?verified=1');
    act(() => {
      result.current.panel.price.period.choose('MONTH');
      result.current.panel.price.max.change('abc');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.panel.price.max.error).toBe('اكتب مبلغًا بالشيكل أكبر من صفر');
    act(() => {
      result.current.panel.price.min.change('10');
    });

    act(() => {
      result.current.panel.sheet.clear.run();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.search).toBe('');
    expect(result.current.panel.price.min).toMatchObject({ text: '', error: null });
    expect(result.current.panel.price.max).toMatchObject({ text: '', error: null });
    expect(result.current.panel.price.period.value).toBe('DAY');
    expect(result.current.panel.price.help).toBe('يُطبَّق «من» و«إلى» على سعر اليوم');
  });

  it('closes the sheet once the screen reaches the sidebar’s width, so it never reopens by itself', () => {
    stubScreenWidth(768);
    const { result, rerender } = renderPanel();
    act(() => {
      result.current.panel.sheet.setOpen(true);
    });
    expect(result.current.panel.sheet.open).toBe(true);

    stubScreenWidth(1440);
    rerender();
    expect(result.current.panel.wide).toBe(true);
    stubScreenWidth(768);
    rerender();

    expect(result.current.panel.wide).toBe(false);
    expect(result.current.panel.sheet.open).toBe(false);
  });
});
