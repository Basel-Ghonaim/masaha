import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { PlaceValue } from '../../types/PlaceValue';
import { useGovernorateAreaOptions } from './useGovernorateAreaOptions';

const GAZA: AdminGovernorateWithAreas = {
  id: 1,
  nameAr: 'غزة',
  nameEn: 'Gaza',
  isActive: true,
  areas: [
    { id: 11, governorateId: 1, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
    { id: 12, governorateId: 1, nameAr: 'النصر', nameEn: 'An-Nasr', isActive: false },
  ],
};
const NORTH: AdminGovernorateWithAreas = {
  id: 2,
  nameAr: 'شمال غزة',
  nameEn: 'North Gaza',
  isActive: false,
  areas: [{ id: 21, governorateId: 2, nameAr: 'جباليا', nameEn: 'Jabalia', isActive: true }],
};

/** The options for `value`, the governorates answered by `answer`; `onValueChange` records choices. */
function renderOptions(
  value: PlaceValue,
  answer: Parameters<typeof fakeTransport>[0] = () => ok([GAZA, NORTH]),
) {
  fakeTransport(answer);
  const onValueChange = vi.fn<(value: PlaceValue) => void>();
  const rendered = renderHook(() => useGovernorateAreaOptions({ value, onValueChange }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, onValueChange };
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useGovernorateAreaOptions', () => {
  it('offers each governorate, then its areas, hidden ones included and marked, in the interface’s language', async () => {
    startPreferences('ar');
    const { result } = renderOptions(null);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.all).toEqual({ value: 'all', label: 'كل المناطق' });
    expect(result.current.groups).toEqual([
      {
        key: 'governorate-1',
        label: 'غزة',
        options: [
          { value: 'governorate-1', label: 'غزة', area: false },
          { value: 'area-11', label: 'الرمال', area: true },
          { value: 'area-12', label: 'النصر (مخفية)', area: true },
        ],
      },
      {
        key: 'governorate-2',
        label: 'شمال غزة (مخفية)',
        options: [
          { value: 'governorate-2', label: 'شمال غزة (مخفية)', area: false },
          { value: 'area-21', label: 'جباليا', area: true },
        ],
      },
    ]);
  });

  it('names the places in English in the English interface', async () => {
    startPreferences('en');
    const { result } = renderOptions(null);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.groups.map(({ label }) => label)).toEqual([
      'Gaza',
      'North Gaza (hidden)',
    ]);
  });

  it.each<[PlaceValue, string]>([
    [null, 'all'],
    [{ governorateId: 2 }, 'governorate-2'],
    [{ areaId: 12 }, 'area-12'],
  ])('shows %j as the option %s', (value, option) => {
    startPreferences('en');
    const { result } = renderOptions(value);

    expect(result.current.value).toBe(option);
  });

  it.each<[string, PlaceValue]>([
    ['all', null],
    ['governorate-2', { governorateId: 2 }],
    ['area-21', { areaId: 21 }],
  ])('hands the option %s back as %j', (option, value) => {
    startPreferences('en');
    const { result, onValueChange } = renderOptions(null);

    act(() => {
      result.current.choose(option);
    });

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(value);
  });

  it('says while the places load, and when they could not be loaded', async () => {
    startPreferences('en');
    const { result } = renderOptions(null, () => refused(403, { type: 'forbidden' }));

    expect(result.current.status).toBe('loading');
    expect(result.current.loadingLabel).toBe('Loading');
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failedLabel).toBe('We couldn’t load the areas');
    expect(result.current.groups).toEqual([]);
  });
});
