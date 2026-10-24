import type { MapPin } from '@masaha/shared/directory';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useAreaCounts } from './useAreaCounts';

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

afterEach(() => {
  restoreTransport();
});

describe('useAreaCounts', () => {
  it('counts the pins by area, and their total, from the unfiltered pins', async () => {
    const requests = fakeTransport(() =>
      ok({ pins: [pin(1, 2), pin(2, 2), pin(3, 7), pin(4, 2)], truncated: false }),
    );
    const { result } = renderHook(() => useAreaCounts(), { wrapper: queryWrapper() });

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect([...result.current.counts]).toEqual([
      [2, 3],
      [7, 1],
    ]);
    expect(result.current.total).toBe(4);
    expect(requests.map((request) => request.url)).toEqual(['/map/spaces']);
    expect(requests[0]?.params).toEqual({});
  });
});
