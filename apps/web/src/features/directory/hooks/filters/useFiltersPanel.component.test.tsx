import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { useDirectoryFilters } from '../list/useDirectoryFilters';
import { useFiltersPanel } from './useFiltersPanel';

/** The filters' panel on the directory at `path`, with the address. */
function renderPanel(path = '/spaces') {
  fakeTransport(() => ok({ HOUR: null, DAY: null, WEEK: null, MONTH: null }));
  const Query = queryWrapper();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Query>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </Query>
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
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useFiltersPanel', () => {
  it('clearing takes off the place, the subscription, both bounds and their texts, and the five boxes, keeping the search and the order', () => {
    vi.useFakeTimers();
    stubScreenWidth(390);
    const { result } = renderPanel(
      '/spaces?q=Hub&area=3&period=MONTH&min=10&open=1&evening=1&friday=1&verified=1&students=1&sort=name',
    );
    act(() => {
      result.current.panel.price.range?.max.change('abc');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.panel.price.range?.max.error).toBe('اكتب مبلغًا بالشيكل أكبر من صفر');
    act(() => {
      result.current.panel.price.range?.min.change('20');
    });

    act(() => {
      result.current.panel.sheet.clear.run();
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.search).toBe('?q=Hub&sort=name');
    expect(result.current.panel.price.range).toBeNull();
    expect(result.current.panel.price.subscription.value).toBe('ALL');
    expect(
      [...result.current.panel.hours.items, ...result.current.panel.others.items].map(
        ({ checked }) => checked,
      ),
    ).toEqual([false, false, false, false, false]);
    act(() => {
      result.current.panel.price.subscription.choose('DAY');
    });
    expect(result.current.panel.price.range?.min).toMatchObject({ text: '', error: null });
    expect(result.current.panel.price.range?.max).toMatchObject({ text: '', error: null });
  });

  it('clearing while ordered by price returns the order to the default', () => {
    stubScreenWidth(1440);
    const { result } = renderPanel('/spaces?period=DAY&sort=priceDesc&verified=1');

    act(() => {
      result.current.panel.sidebar.clear.run();
    });

    expect(result.current.search).toBe('');
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
