import type { LookupsCatalogue } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAreaOptions } from './useAreaOptions';

// The public catalogue holds the active governorates and their active areas only.
const CATALOGUE: LookupsCatalogue = {
  governorates: [
    {
      id: 1,
      nameAr: 'غزة',
      nameEn: 'Gaza',
      areas: [
        { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
        { id: 13, nameAr: 'الشيخ رضوان', nameEn: 'Sheikh Radwan' },
      ],
    },
    {
      id: 3,
      nameAr: 'رفح',
      nameEn: 'Rafah',
      areas: [{ id: 31, nameAr: 'تل السلطان', nameEn: 'Tal as-Sultan' }],
    },
  ],
  amenities: [],
};

/** The options for `value`, the catalogue answered by `answer`; `onValueChange` records choices. */
function renderOptions(
  value: number | null,
  answer: Parameters<typeof fakeTransport>[0] = () => ok(CATALOGUE),
) {
  const requests = fakeTransport(answer);
  const onValueChange = vi.fn<(areaId: number) => void>();
  const rendered = renderHook(() => useAreaOptions({ value, onValueChange }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, onValueChange, requests };
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAreaOptions', () => {
  it('reads the public catalogue, never the admin’s lists with their hidden rows', async () => {
    startPreferences('en');
    const { result, requests } = renderOptions(null);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /lookups',
    ]);
  });

  it('groups each governorate’s areas under it, in order, in the interface’s language', async () => {
    startPreferences('ar');
    const { result } = renderOptions(null);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.groups).toEqual([
      {
        key: '1',
        label: 'غزة',
        options: [
          { value: '11', label: 'الرمال' },
          { value: '13', label: 'الشيخ رضوان' },
        ],
      },
      { key: '3', label: 'رفح', options: [{ value: '31', label: 'تل السلطان' }] },
    ]);
  });

  it('names the places in English in the English interface', async () => {
    startPreferences('en');
    const { result } = renderOptions(null);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(
      result.current.groups.flatMap(({ options }) => options.map(({ label }) => label)),
    ).toEqual(['Al-Rimal', 'Sheikh Radwan', 'Tal as-Sultan']);
  });

  it('shows the area chosen, or none, and hands a choice back as the area’s id', () => {
    startPreferences('en');
    const { result, onValueChange } = renderOptions(13);

    expect(result.current.value).toBe('13');
    act(() => {
      result.current.choose('31');
    });
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(31);
    expect(renderOptions(null).result.current.value).toBe('');
  });

  it('says while the areas load, and when they could not be loaded', async () => {
    startPreferences('en');
    const { result } = renderOptions(null, () => refused(404, { type: 'not_found' }));

    expect(result.current.status).toBe('loading');
    expect(result.current.loadingLabel).toBe('Loading');
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failedLabel).toBe('We couldn’t load the areas');
    expect(result.current.groups).toEqual([]);
  });
});
