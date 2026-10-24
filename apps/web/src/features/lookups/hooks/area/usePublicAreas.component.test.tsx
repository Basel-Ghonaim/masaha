import type { LookupsCatalogue } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { usePublicAreas } from './usePublicAreas';

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

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('usePublicAreas', () => {
  it.each([
    [
      'ar',
      [
        { id: 11, name: 'الرمال', governorate: 'غزة' },
        { id: 12, name: 'النصر', governorate: 'غزة' },
        { id: 51, name: 'المواصي', governorate: 'خان يونس' },
      ],
    ],
    [
      'en',
      [
        { id: 11, name: 'Al-Rimal', governorate: 'Gaza City' },
        { id: 12, name: 'An-Nasr', governorate: 'Gaza City' },
        { id: 51, name: 'Al-Mawasi', governorate: 'Khan Younis' },
      ],
    ],
  ] as const)(
    'lists the catalogue’s areas in order, each with its governorate (%s)',
    async (language, areas) => {
      startPreferences(language);
      const requests = fakeTransport(() => ok(CATALOGUE));
      const { result } = renderHook(() => usePublicAreas(), { wrapper: queryWrapper() });

      expect(result.current.state).toBe('loading');
      await waitFor(() => {
        expect(result.current.state).toBe('ready');
      });
      expect(result.current.areas).toEqual(areas);
      expect(requests.map((request) => request.url)).toEqual(['/lookups']);
    },
  );

  it('says when the catalogue failed, and reads it again on retry', async () => {
    startPreferences('ar');
    let fail = true;
    const requests = fakeTransport(() =>
      fail ? refused(404, { type: 'not_found' }) : ok(CATALOGUE),
    );
    const { result } = renderHook(() => usePublicAreas(), { wrapper: queryWrapper() });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.areas).toEqual([]);
    fail = false;
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(requests).toHaveLength(2);
  });
});
