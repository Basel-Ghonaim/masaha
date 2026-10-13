import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAreaName } from './useAreaName';

const GOVERNORATES: AdminGovernorateWithAreas[] = [
  {
    id: 1,
    nameAr: 'غزة',
    nameEn: 'Gaza',
    isActive: true,
    areas: [
      { id: 11, governorateId: 1, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
      { id: 12, governorateId: 1, nameAr: 'الشجاعية', nameEn: 'Shujaiya', isActive: false },
    ],
  },
];

function renderName(areaId: number) {
  const requests = fakeTransport(() => ok(GOVERNORATES));
  return { ...renderHook(() => useAreaName(areaId), { wrapper: queryWrapper() }), requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAreaName', () => {
  it('names a space’s area with its governorate', async () => {
    const { result } = renderName(11);

    await waitFor(() => {
      expect(result.current).toBe('Al-Rimal · Gaza');
    });
  });

  it('names a hidden area too, in the interface’s language', async () => {
    startPreferences('ar');
    const { result } = renderName(12);

    await waitFor(() => {
      expect(result.current).toBe('الشجاعية · غزة');
    });
  });

  it('is empty for an area the lists do not hold', async () => {
    const { result, requests } = renderName(99);

    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(result.current).toBe('');
  });
});
