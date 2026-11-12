import type { SpacePackage } from '@masaha/shared/packages';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { usePackageShiftIds } from './usePackageShiftIds';

const PACKAGE: SpacePackage = {
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

afterEach(() => {
  restoreTransport();
});

describe('usePackageShiftIds', () => {
  it('names each shift a package uses once, a retired package’s included', async () => {
    const requests = fakeTransport(() =>
      ok([
        { ...PACKAGE, id: 4, shiftId: 21 },
        { ...PACKAGE, id: 5, shiftId: 22, isActive: false },
        { ...PACKAGE, id: 6, shiftId: 21 },
        PACKAGE,
      ]),
    );
    const { result } = renderHook(() => usePackageShiftIds(7), { wrapper: queryWrapper() });

    expect(result.current).toEqual([]);
    await waitFor(() => {
      expect(result.current).toEqual([21, 22]);
    });
    expect(requests.map(({ url }) => url)).toEqual(['/manage/spaces/7/packages']);
  });
});
