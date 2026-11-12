import type { AdminAmenity, LookupsCatalogue } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useAmenityCatalogue } from './useAmenityCatalogue';

const ADMIN: AdminAmenity[] = [
  { id: 1, key: 'internet', nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi', isActive: true },
  {
    id: 2,
    key: 'generator',
    nameAr: 'مولّد',
    nameEn: 'Generator',
    icon: 'plug-zap',
    isActive: false,
  },
];

const CATALOGUE: LookupsCatalogue = {
  governorates: [],
  amenities: [{ id: 1, key: 'internet', nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi' }],
};

function renderCatalogue(source: 'admin' | 'public') {
  const urls: string[] = [];
  fakeTransport(({ url }) => {
    urls.push(url ?? '');
    return url === '/lookups' ? ok(CATALOGUE) : ok(ADMIN);
  });
  const { result } = renderHook(() => useAmenityCatalogue(source), { wrapper: queryWrapper() });
  return { result, urls };
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAmenityCatalogue', () => {
  it('is undefined until the list has arrived, which has not failed', () => {
    const { result } = renderCatalogue('public');

    expect(result.current.entries).toBeUndefined();
    expect(result.current.failed).toBe(false);
  });

  it('gives the admin every amenity of the admin’s list, a retired one marked, with its icon', async () => {
    const { result, urls } = renderCatalogue('admin');

    await waitFor(() => {
      expect(result.current.entries).toEqual([
        { id: 1, nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi', isActive: true },
        { id: 2, nameAr: 'مولّد', nameEn: 'Generator', icon: 'plug-zap', isActive: false },
      ]);
    });
    expect(urls).not.toContain('/lookups');
  });

  it('gives an owner the public catalogue’s amenities, never asking for the admin’s list', async () => {
    const { result, urls } = renderCatalogue('public');

    await waitFor(() => {
      expect(result.current.entries).toEqual([
        { id: 1, nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi', isActive: true },
      ]);
    });
    expect(urls).toEqual(['/lookups']);
  });

  it('says once the list has failed, and reads it again on `retry`', async () => {
    let failing = true;
    fakeTransport(() => (failing ? refused(403, { type: 'forbidden' }) : ok(CATALOGUE)));
    const { result } = renderHook(() => useAmenityCatalogue('public'), {
      wrapper: queryWrapper(),
    });
    await waitFor(() => {
      expect(result.current.failed).toBe(true);
    });
    expect(result.current.entries).toBeUndefined();

    failing = false;
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(1);
    });
    expect(result.current.failed).toBe(false);
  });
});
