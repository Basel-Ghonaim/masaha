import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../../test/startPreferences';
import { useDirectoryFilters } from '../list/useDirectoryFilters';
import { usePriceFilter } from './usePriceFilter';

/** The price filter on the directory at `path`, with the filters' request and the address. */
function renderPrice(path = '/spaces') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const filters = useDirectoryFilters();
      return {
        filters,
        price: usePriceFilter({ filters: filters.filters, apply: filters.apply }).view,
        search: useLocation().search,
        navigate: useNavigate(),
      };
    },
    { wrapper },
  );
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePriceFilter', () => {
  it('writes a valid budget to the address after the pause, asked in agorot, and leaves an invalid bound out with its line', async () => {
    const { result } = renderPrice('/spaces?page=2');

    act(() => {
      result.current.price.min.change('١٠');
      result.current.price.max.change('30');
    });
    expect(result.current.search).toBe('?page=2');
    await waitFor(() => {
      expect(result.current.search).toBe('?period=DAY&min=10&max=30');
    });
    expect(result.current.filters.request).toMatchObject({
      period: 'DAY',
      priceMin: 1000,
      priceMax: 3000,
    });
    expect(result.current.price.help).toBe('يُطبَّق «من» و«إلى» على سعر اليوم');

    act(() => {
      result.current.price.max.change('abc');
    });
    expect(result.current.price.max.error).toBe('اكتب مبلغًا بالشيكل أكبر من صفر');
    await waitFor(() => {
      expect(result.current.search).toBe('?period=DAY&min=10');
    });
    expect(result.current.price.max.text).toBe('abc');

    act(() => {
      result.current.price.max.change('5');
    });
    expect(result.current.price.max.error).toBe('أقل من الحد الأدنى');
  });

  it('keeps a period chosen before any bound, and follows an address changed elsewhere', async () => {
    const { result } = renderPrice('/spaces');

    act(() => {
      result.current.price.period.choose('MONTH');
    });
    expect(result.current.search).toBe('');
    expect(result.current.price.period.value).toBe('MONTH');
    act(() => {
      result.current.price.max.change('300');
    });
    await waitFor(() => {
      expect(result.current.search).toBe('?period=MONTH&max=300');
    });

    act(() => {
      void result.current.navigate('/spaces?period=WEEK&min=20');
    });
    expect(result.current.price.min.text).toBe('20');
    expect(result.current.price.max.text).toBe('');
    expect(result.current.price.period.value).toBe('WEEK');
  });
});
