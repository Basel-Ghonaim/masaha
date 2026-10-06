import type { ManagedSpace } from '@masaha/shared/space-links';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { startPreferences } from '../../../test/startPreferences';
import { useSpaceSwitcher } from './useSpaceSwitcher';

const FOCUS: ManagedSpace = {
  spaceId: 7,
  role: 'OWNER',
  slug: 'focus-hub',
  nameAr: 'فوكس هب',
  nameEn: 'Focus Hub',
  area: { nameAr: 'النصر', nameEn: 'An-Nasr' },
};

const NOOK: ManagedSpace = {
  spaceId: 3,
  role: 'RECEPTION',
  slug: 'nook',
  nameAr: null,
  nameEn: 'Nook',
  area: { nameAr: 'الرمال', nameEn: 'Al-Rimal' },
};

/** The hook for the space `spaceId`, in `language`, once the user's `spaces` have arrived. */
async function switcherFor(
  spaceId: number | undefined,
  spaces: ManagedSpace[],
  language: 'ar' | 'en' = 'en',
) {
  startPreferences(language);
  fakeTransport(() => ok(spaces));
  const { result } = renderHook(() => useSpaceSwitcher(spaceId), { wrapper: queryWrapper() });
  await waitFor(() => {
    expect(result.current.status).toBe('ready');
  });
  return result.current;
}

afterEach(() => {
  restoreTransport();
});

describe('useSpaceSwitcher', () => {
  it('words each space in English by its English name and area', async () => {
    const switcher = await switcherFor(7, [FOCUS, NOOK]);

    expect(switcher.spaces).toEqual([
      expect.objectContaining({
        name: 'Focus Hub',
        nameLanguage: undefined,
        nameDir: undefined,
        area: 'An-Nasr',
        initial: 'F',
      }),
      expect.objectContaining({ name: 'Nook', nameLanguage: undefined, area: 'Al-Rimal' }),
    ]);
  });

  it('words each space in Arabic, an English-only name marked as English', async () => {
    const switcher = await switcherFor(7, [FOCUS, NOOK], 'ar');

    expect(switcher.spaces).toEqual([
      expect.objectContaining({
        name: 'فوكس هب',
        nameLanguage: undefined,
        nameDir: undefined,
        area: 'النصر',
        initial: 'ف',
      }),
      expect.objectContaining({
        name: 'Nook',
        nameLanguage: 'en',
        nameDir: 'ltr',
        area: 'الرمال',
        initial: 'N',
      }),
    ]);
  });

  it('holds the space in the URL as the current one, named in the trigger', async () => {
    const switcher = await switcherFor(3, [FOCUS, NOOK]);

    expect(switcher.current?.spaceId).toBe(3);
    expect(switcher.triggerLabel).toBe('Switch space: ⁨Nook⁩');
    expect(switcher.canSwitch).toBe(true);
  });

  it('keeps the spaces it holds when a later refetch fails', async () => {
    startPreferences('en');
    let calls = 0;
    fakeTransport(() => {
      calls += 1;
      return calls === 1 ? ok([FOCUS]) : refused(403, { type: 'forbidden' });
    });
    const { result } = renderHook(() => useSpaceSwitcher(7), { wrapper: queryWrapper() });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(calls).toBe(2);
    });
    // The refused refetch settles the query as failed before the next task.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(result.current.status).toBe('ready');
    expect(result.current.current?.name).toBe('Focus Hub');
  });

  it('is an error when the spaces never arrived', async () => {
    startPreferences('en');
    fakeTransport(() => refused(403, { type: 'forbidden' }));
    const { result } = renderHook(() => useSpaceSwitcher(7), { wrapper: queryWrapper() });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
  });

  it('has nothing to switch to when the user’s only space is the one shown', async () => {
    const switcher = await switcherFor(7, [FOCUS]);

    expect(switcher.canSwitch).toBe(false);
  });

  it('offers the user’s spaces when the URL’s space is none of theirs', async () => {
    const switcher = await switcherFor(9, [FOCUS]);

    expect(switcher.current).toBeUndefined();
    expect(switcher.canSwitch).toBe(true);
    expect(switcher.triggerLabel).toBe('Choose a space');
  });
});
