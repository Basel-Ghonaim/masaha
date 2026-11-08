import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useDirectoryFilters } from '../list/useDirectoryFilters';
import { usePriceFilter } from './usePriceFilter';

const RANGES = {
  HOUR: null,
  DAY: { minAgorot: 1250, maxAgorot: 9950 },
  WEEK: null,
  MONTH: { minAgorot: 20000, maxAgorot: 45000 },
};

/** The price filter on the directory at `path`, with the filters' request and the address. */
function renderPrice(path = '/spaces') {
  const requests = fakeTransport(() => ok(RANGES));
  const Query = queryWrapper();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Query>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </Query>
  );
  const rendered = renderHook(
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
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('usePriceFilter', () => {
  it('offers «الكل» and the four subscriptions, «الكل» chosen with no budget and its hint', () => {
    const { result } = renderPrice();

    expect(result.current.price.subscription).toMatchObject({
      label: 'نوع الاشتراك',
      value: 'ALL',
      options: [
        { value: 'ALL', label: 'الكل' },
        { value: 'HOUR', label: 'ساعة' },
        { value: 'DAY', label: 'يوم' },
        { value: 'WEEK', label: 'أسبوع' },
        { value: 'MONTH', label: 'شهر' },
      ],
    });
    expect(result.current.price.range).toBeNull();
    expect(result.current.price.line).toBe('اختر نوع الاشتراك لتحديد نطاق السعر أو الترتيب حسبه.');
    expect(result.current.filters.request).not.toHaveProperty('period');
  });

  it('a subscription applies at once, alone, and shows its budget hinted by its lowest and highest price in whole shekels', async () => {
    const { result, requests } = renderPrice();

    act(() => {
      result.current.price.subscription.choose('DAY');
    });

    expect(result.current.search).toBe('?period=DAY');
    expect(result.current.filters.request).toMatchObject({ period: 'DAY' });
    expect(result.current.filters.request).not.toHaveProperty('priceMin');
    expect(result.current.price.line).toBe('بالشيكل، على السعر اليومي.');
    await waitFor(() => {
      expect(result.current.price.range?.min.placeholder).toBe('12');
    });
    expect(result.current.price.range?.max.placeholder).toBe('100');
    expect(requests.map(({ url }) => url)).toEqual(['/price-ranges']);

    act(() => {
      result.current.price.subscription.choose('WEEK');
    });
    // No week price among the spaces: no hint.
    expect(result.current.price.range?.min.placeholder).toBe('');
  });

  it('writes a valid budget after the pause, asked in agorot; a refused bound is said on its field and left out', async () => {
    const { result } = renderPrice('/spaces?period=MONTH&page=2');

    act(() => {
      result.current.price.range?.min.change('٢٥٠');
      result.current.price.range?.max.change('300');
    });
    expect(result.current.search).toBe('?period=MONTH&page=2');
    await waitFor(() => {
      expect(result.current.search).toBe('?period=MONTH&min=250&max=300');
    });
    expect(result.current.filters.request).toMatchObject({
      period: 'MONTH',
      priceMin: 25000,
      priceMax: 30000,
    });

    for (const [text, error] of [
      ['0', 'اكتب مبلغًا بالشيكل أكبر من صفر'],
      ['12.5', 'اكتب مبلغًا بالشيكل أكبر من صفر'],
    ] as const) {
      act(() => {
        result.current.price.range?.min.change(text);
      });
      expect(result.current.price.range?.min.error).toBe(error);
      await waitFor(() => {
        expect(result.current.search).toBe('?period=MONTH&max=300');
      });
      expect(result.current.price.range?.min.text).toBe(text);
    }

    act(() => {
      result.current.price.range?.min.change('400');
    });
    expect(result.current.price.range?.max.error).toBe('«إلى» أقل من «من».');
    expect(result.current.price.range?.min.error).toBeNull();
    await waitFor(() => {
      expect(result.current.search).toBe('?period=MONTH&min=400');
    });
  });

  it('«الكل» takes off the subscription and both bounds', () => {
    const { result } = renderPrice('/spaces?period=DAY&min=10&max=30');

    act(() => {
      result.current.price.subscription.choose('ALL');
    });

    expect(result.current.search).toBe('');
    expect(result.current.filters.request).toEqual({ limit: 18 });
    expect(result.current.price.range).toBeNull();
  });

  it('«الكل» empties the fields, a refused text the address never held included', async () => {
    const { result } = renderPrice('/spaces?period=DAY');
    act(() => {
      result.current.price.range?.min.change('abc');
    });
    expect(result.current.price.range?.min.error).toBe('اكتب مبلغًا بالشيكل أكبر من صفر');

    act(() => {
      result.current.price.subscription.choose('ALL');
    });
    // Chosen again, the subscription's fields start empty.
    act(() => {
      result.current.price.subscription.choose('DAY');
    });

    expect(result.current.price.range?.min).toMatchObject({ text: '', error: null });
    expect(result.current.price.range?.max).toMatchObject({ text: '', error: null });
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(result.current.search).toBe('?period=DAY');
  });

  it.each([
    ['/spaces?period=MONTH&sort=priceAsc', ''],
    ['/spaces?period=MONTH&sort=priceDesc&q=Hub', '?q=Hub'],
    ['/spaces?period=MONTH&sort=name', '?sort=name'],
  ])('«الكل» from %s returns a price order to the default and keeps any other', (path, after) => {
    const { result } = renderPrice(path);

    act(() => {
      result.current.price.subscription.choose('ALL');
    });

    expect(result.current.search).toBe(after);
  });

  it('follows an address changed elsewhere', () => {
    const { result } = renderPrice('/spaces?period=MONTH&max=300');

    act(() => {
      void result.current.navigate('/spaces?period=WEEK&min=20');
    });

    expect(result.current.price.subscription.value).toBe('WEEK');
    expect(result.current.price.range?.min.text).toBe('20');
    expect(result.current.price.range?.max.text).toBe('');
  });
});
