import type { LookupsCatalogue } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAreaFilter } from './useAreaFilter';

const CATALOGUE: LookupsCatalogue = {
  governorates: [
    {
      id: 2,
      nameAr: 'غزة',
      nameEn: 'Gaza City',
      areas: [
        { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
        { id: 12, nameAr: 'النصر', nameEn: 'An-Nasr' },
      ],
    },
    { id: 4, nameAr: 'دير البلح', nameEn: 'Deir al-Balah', areas: [] },
    {
      id: 5,
      nameAr: 'خان يونس',
      nameEn: 'Khan Younis',
      areas: [{ id: 51, nameAr: 'المواصي', nameEn: 'Al-Mawasi' }],
    },
  ],
  amenities: [],
};

/** The filter holding `value`; the fake server answers with `answer`, the catalogue by default. */
function renderFilter(
  value: readonly number[],
  answer: Parameters<typeof fakeTransport>[0] = () => ok(CATALOGUE),
) {
  const requests = fakeTransport(answer);
  return {
    ...renderHook(() => useAreaFilter({ value }), { wrapper: queryWrapper() }),
    requests,
  };
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAreaFilter', () => {
  it('offers the public catalogue’s areas under their governorates, none chosen, a governorate with no area left out, never asking for the admin’s lists', async () => {
    startPreferences('ar');
    const { result, requests } = renderFilter([]);

    expect(result.current.loading).toBe('جارٍ تحميل المناطق…');
    await waitFor(() => {
      expect(result.current.loading).toBeNull();
    });
    expect(result.current.label).toBe('المنطقة');
    expect(result.current.summary).toBe('كل المناطق');
    expect(result.current.failure).toBeNull();
    expect(result.current.groups).toEqual([
      {
        key: 2,
        heading: 'غزة',
        items: [
          { value: '11', text: 'الرمال', keywords: ['الرمال', 'Al-Rimal'] },
          { value: '12', text: 'النصر', keywords: ['النصر', 'An-Nasr'] },
        ],
      },
      {
        key: 5,
        heading: 'خان يونس',
        items: [{ value: '51', text: 'المواصي', keywords: ['المواصي', 'Al-Mawasi'] }],
      },
    ]);
    expect(requests.map((request) => request.url)).toEqual(['/lookups']);
  });

  it('sums up the choice: all areas, one area by its name, then counted in Arabic (2, 3, 11)', async () => {
    startPreferences('ar');
    const one = renderFilter([12]);
    await waitFor(() => {
      expect(one.result.current.summary).toBe('النصر');
    });
    one.unmount();

    const many = (count: number) => Array.from({ length: count }, (_, index) => index + 100);
    expect(renderFilter(many(2)).result.current.summary).toBe('منطقتان محددتان');
    expect(renderFilter(many(3)).result.current.summary).toBe('3 مناطق محددة');
    expect(renderFilter(many(11)).result.current.summary).toBe('11 منطقة محددة');

    // An area the catalogue does not hold (hidden since) is still counted.
    const unknown = renderFilter([99]);
    await waitFor(() => {
      expect(unknown.result.current.loading).toBeNull();
    });
    expect(unknown.result.current.summary).toBe('منطقة واحدة محددة');
  });

  it('says the catalogue failed inside the list and tries again', async () => {
    startPreferences('en');
    const { result, requests } = renderFilter([], (_request, index) =>
      index === 0 ? refused(404, { type: 'not_found' }) : ok(CATALOGUE),
    );

    await waitFor(() => {
      expect(result.current.failure).not.toBeNull();
    });
    expect(result.current.loading).toBeNull();
    expect(result.current.groups).toEqual([]);
    expect(result.current.failure?.line).toBe('We couldn’t load the areas');
    expect(result.current.failure?.retry.label).toBe('Try again');

    act(() => {
      result.current.failure?.retry.run();
    });

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });
    expect(result.current.failure).toBeNull();
    expect(requests).toHaveLength(2);
  });
});
