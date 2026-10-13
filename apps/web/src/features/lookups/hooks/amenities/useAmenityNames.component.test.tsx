import type { AdminAmenity } from '@masaha/shared/lookups';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAmenityNames } from './useAmenityNames';

const amenity = (id: number, nameEn: string, nameAr: string, isActive = true): AdminAmenity => ({
  id,
  key: nameEn.toLowerCase(),
  nameAr,
  nameEn,
  icon: 'wifi',
  isActive,
});

const AMENITIES = [
  amenity(1, 'Internet', 'إنترنت'),
  amenity(2, 'Generator', 'مولّد', false),
  amenity(3, 'Solar power', 'طاقة شمسية'),
];

function renderNames(ids: number[]) {
  fakeTransport(() => ok(AMENITIES));
  return renderHook(() => useAmenityNames(ids), { wrapper: queryWrapper() });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAmenityNames', () => {
  it('names a space’s amenities in the list’s order, a retired one included', async () => {
    const { result } = renderNames([3, 2, 1]);

    await waitFor(() => {
      expect(result.current).toBe('Internet, Generator, and Solar power');
    });
  });

  it('names them in Arabic in the Arabic interface', async () => {
    startPreferences('ar');
    const { result } = renderNames([1, 3]);

    await waitFor(() => {
      expect(result.current).toBe('إنترنت وطاقة شمسية');
    });
  });

  it('is empty while the list loads', () => {
    const { result } = renderNames([1]);

    expect(result.current).toBe('');
  });
});
