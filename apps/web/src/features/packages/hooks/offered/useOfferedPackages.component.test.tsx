import type { SpacePackage } from '@masaha/shared/packages';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useOfferedPackages } from './useOfferedPackages';

const WEEK: SpacePackage = {
  id: 3,
  name: '10 days',
  validityDays: 30,
  totalDays: 10,
  daysPerWeek: null,
  hoursPerDay: null,
  totalHours: null,
  billing: 'FIXED',
  priceAgorot: 15000,
  audience: 'GENERAL',
  shiftId: null,
  isActive: true,
};
const RETIRED: SpacePackage = { ...WEEK, id: 4, name: 'Morning', isActive: false };
const HOURS: SpacePackage = { ...WEEK, id: 5, name: '20 hours', billing: 'PER_HOUR' };

afterEach(() => {
  restoreTransport();
});

describe('useOfferedPackages', () => {
  it('lists the offered packages only, in the list’s order', async () => {
    const requests = fakeTransport(() => ok([HOURS, RETIRED, WEEK]));
    const { result } = renderHook(() => useOfferedPackages(7), { wrapper: queryWrapper() });

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.packages.map(({ id }) => id)).toEqual([5, 3]);
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/packages']);
  });

  it('says it failed, and reads them again on «Try again»', async () => {
    // A refusal, which the transport sends once (a server error is sent again, with a pause).
    let answer = refused(403, { type: 'forbidden' });
    const requests = fakeTransport(() => answer);
    const { result } = renderHook(() => useOfferedPackages(7), { wrapper: queryWrapper() });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.packages).toEqual([]);
    answer = ok([WEEK]);
    result.current.retry();
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.packages.map(({ id }) => id)).toEqual([3]);
    expect(requests.length).toBeGreaterThan(1);
  });
});
