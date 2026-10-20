import type { AdminAmenity, LookupsCatalogue } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { LookupsSource } from '../../types/LookupsSource';
import { useAmenityChecklist } from './useAmenityChecklist';

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
  amenity(4, 'Printer', 'طابعة', false),
];

// The public catalogue names the active amenities only.
const CATALOGUE: LookupsCatalogue = {
  governorates: [],
  amenities: AMENITIES.filter(({ isActive }) => isActive).map(
    ({ id, key, nameAr, nameEn, icon }) => ({ id, key, nameAr, nameEn, icon }),
  ),
};

/** The checklist's hook from `source`'s list, for a space that has `linked`, its value `value`. */
function renderChecklist(
  value: number[],
  linked: number[],
  answer: () => FakeAnswer = () => ok(AMENITIES),
  source: LookupsSource = 'admin',
) {
  const requests = fakeTransport(answer);
  const onValueChange = vi.fn<(ids: number[]) => void>();
  const rendered = renderHook(() => useAmenityChecklist({ source, value, linked, onValueChange }), {
    wrapper: queryWrapper(),
  });
  return { ...rendered, onValueChange, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAmenityChecklist', () => {
  it('offers an owner the public catalogue’s amenities, keeping a retired linked one in the value and counting it', async () => {
    startPreferences('ar');
    const { result, onValueChange, requests } = renderChecklist(
      [2, 3],
      [2, 3],
      () => ok(CATALOGUE),
      'public',
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'get /lookups',
    ]);
    expect(
      result.current.items.map(({ id, checked, inactive }) => [id, checked, inactive]),
    ).toEqual([
      [1, false, false],
      [3, true, false],
    ]);
    expect(result.current.retiredKept).toBe(
      'يبقى مرفق واحد لم يعد في قائمة المنصة مرتبطًا بالمساحة.',
    );
    act(() => {
      result.current.items[0]?.toggle(true);
    });
    expect(onValueChange).toHaveBeenLastCalledWith([2, 3, 1]);
    act(() => {
      result.current.items[1]?.toggle(false);
    });
    expect(onValueChange).toHaveBeenLastCalledWith([2]);
  });

  it('counts nothing for the admin, whose list names every amenity', async () => {
    const { result } = renderChecklist([2], [2]);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.retiredKept).toBeNull();
  });

  it('offers the active amenities in order, named in the interface’s language, ticked by its value', async () => {
    const { result } = renderChecklist([3], [3]);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(
      result.current.items.map(({ id, name, checked, inactive }) => [id, name, checked, inactive]),
    ).toEqual([
      [1, 'Internet', false, false],
      [3, 'Solar power', true, false],
    ]);
  });

  it('offers a retired amenity the space has, marked, even once unticked, and no other retired one', async () => {
    const { result } = renderChecklist([], [2]);

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(
      result.current.items.map(({ id, checked, inactive }) => [id, checked, inactive]),
    ).toEqual([
      [1, false, false],
      [2, false, true],
      [3, false, false],
    ]);
  });

  it('hands back the amenities chosen as one is ticked or unticked', async () => {
    const { result, onValueChange } = renderChecklist([3], [3]);
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      result.current.items[0]?.toggle(true);
    });
    expect(onValueChange).toHaveBeenLastCalledWith([3, 1]);
    act(() => {
      result.current.items[1]?.toggle(false);
    });
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  it('names the amenities in Arabic in the Arabic interface', async () => {
    startPreferences('ar');
    const { result } = renderChecklist([], []);

    await waitFor(() => {
      expect(result.current.items[0]?.name).toBe('إنترنت');
    });
  });

  it('is loading, then failed, and loads the list again on retry', async () => {
    let fail = true;
    const { result } = renderChecklist([], [], () =>
      fail ? refused(403, { type: 'forbidden' }) : ok(AMENITIES),
    );
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    fail = false;
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });
});
