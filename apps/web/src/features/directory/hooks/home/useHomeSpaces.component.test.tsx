import type { DirectorySpace } from '@masaha/shared/directory';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../near/nearMeStore';
import { useHomeSpaces } from './useHomeSpaces';

const space = (id: number): DirectorySpace => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: null,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: 'AVAILABLE',
});

/** A page of the list, as the server answers it. */
const page = (spaces: DirectorySpace[]) => ({
  status: 200,
  data: {
    success: true,
    data: spaces,
    meta: {
      currentPage: 1,
      limit: 6,
      totalPages: spaces.length === 0 ? 0 : 1,
      totalRecords: spaces.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
});

/** Home's spaces, the fake server answering with `spaces`. */
function renderHome(spaces: DirectorySpace[]) {
  const requests = fakeTransport(() => page(spaces));
  const rendered = renderHook(() => useHomeSpaces({ chooseArea: vi.fn(), openMap: vi.fn() }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
});

afterEach(() => {
  restoreTransport();
});

describe('useHomeSpaces', () => {
  it('shows the spaces available now, six at most, and «عرض الكل» to the available list', async () => {
    const { result, requests } = renderHome([1, 2, 3].map(space));

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.title).toBe('متاحة الآن');
    expect(result.current.cards.map((card) => card.slug)).toEqual([
      'space-1',
      'space-2',
      'space-3',
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.params).toEqual({ limit: 6, availableNow: true });
    expect(requests[0]?.headers['Masaha-Near']).toBeUndefined();
    expect(result.current.viewAll).toEqual({ label: 'عرض الكل', to: 'available' });
  });

  it('with a point, the nearest six through the header, titled «المساحات الأقرب إليك», «عرض الكل» keeping the order', async () => {
    nearMeStore.granted({ lat: 31.501, lng: 34.467 }, 'device');
    const { result, requests } = renderHome([space(4)]);

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.title).toBe('المساحات الأقرب إليك');
    expect(requests).toHaveLength(1);
    expect(requests[0]?.params).toEqual({ limit: 6, sort: 'distance' });
    expect(requests[0]?.headers['Masaha-Near']).toBe('31.501,34.467');
    expect(result.current.near.button.on).toBe(true);
    expect(result.current.viewAll).toEqual({ label: 'عرض الكل', to: 'list' });
  });

  it('with none available now, says so and offers browsing all the spaces', async () => {
    const { result } = renderHome([]);

    await waitFor(() => {
      expect(result.current.state).toBe('empty');
    });
    expect(result.current.empty).toEqual({
      title: 'لا توجد مساحات متاحة الآن',
      text: 'قد تكون المساحات ممتلئة أو مغلقة في هذا الوقت. تصفّح كل المساحات لمعرفة ساعات عملها.',
      action: 'تصفّح كل المساحات',
    });
  });
});
