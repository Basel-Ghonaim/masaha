import type { MapPin } from '@masaha/shared/directory';
import type { LookupsCatalogue } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAreaCards } from './useAreaCards';

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
    {
      id: 5,
      nameAr: 'خان يونس',
      nameEn: 'Khan Younis',
      areas: [{ id: 51, nameAr: 'المواصي', nameEn: 'Al-Mawasi' }],
    },
  ],
  amenities: [],
};

const pin = (id: number, areaId: number): MapPin => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: null,
  areaId,
  location: { lat: 31.5, lng: 34.45 },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: null,
});

/** Three spaces in Khan Younis's area, one in Al-Rimal, none in An-Nasr. */
const PINS = { pins: [pin(1, 51), pin(2, 11), pin(3, 51), pin(4, 51)], truncated: false };

afterEach(() => {
  restoreTransport();
});

describe('useAreaCards', () => {
  it('lists only the areas with spaces, in the catalogue’s order, then «كل المناطق» with the total', async () => {
    startPreferences('ar');
    fakeTransport((request) => (request.url === '/lookups' ? ok(CATALOGUE) : ok(PINS)));
    const { result } = renderHook(() => useAreaCards(), { wrapper: queryWrapper() });

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.cards).toEqual([
      { key: '11', title: 'الرمال', line: '⁨غزة⁩ · مساحة واحدة', to: '/spaces?area=11' },
      {
        key: '51',
        title: 'المواصي',
        line: '⁨خان يونس⁩ · 3 مساحات',
        to: '/spaces?area=51',
      },
      { key: 'all', title: 'كل المناطق', line: '⁨قطاع غزة⁩ · 4 مساحات', to: '/spaces' },
    ]);
  });

  it('says when either read failed, and its one retry reads both again', async () => {
    startPreferences('en');
    let fail = true;
    const requests = fakeTransport((request) =>
      fail && request.url === '/lookups'
        ? refused(404, { type: 'not_found' })
        : request.url === '/lookups'
          ? ok(CATALOGUE)
          : ok(PINS),
    );
    const { result } = renderHook(() => useAreaCards(), { wrapper: queryWrapper() });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.failed).toBe('We couldn’t load the areas');
    fail = false;
    act(() => {
      result.current.retry.run();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.retry.label).toBe('Try again');
    expect(requests.filter((request) => request.url === '/lookups')).toHaveLength(2);
    expect(requests.filter((request) => request.url === '/map/spaces')).toHaveLength(2);
  });
});
