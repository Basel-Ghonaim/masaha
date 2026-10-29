import type { DirectorySpace, FavoriteSpace } from '@masaha/shared/directory';
import { establishSession, restoreSession } from '@shared/session';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { useFavoriteIds } from './useFavoriteIds';

const LISTED: DirectorySpace = {
  id: 7,
  slug: 'masaha-hub',
  nameEn: 'Masaha Hub',
  nameAr: null,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: null,
};

const FAVORITES: FavoriteSpace[] = [
  { listed: true, savedAt: '2026-10-27T09:00:00.000Z', space: LISTED },
  {
    listed: false,
    savedAt: '2026-10-20T09:00:00.000Z',
    space: { id: 9, nameEn: 'Old Hub', nameAr: null },
  },
];

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('useFavoriteIds', () => {
  it('reads the user’s favourites with a session: the ids of the listed and of the gone', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const requests = fakeTransport(() => ok(FAVORITES));

    const { result } = renderHook(() => useFavoriteIds(), { wrapper: queryWrapper() });

    expect(result.current).toBeNull();
    await waitFor(() => {
      expect(result.current).toEqual(new Set([7, 9]));
    });
    expect(requests.map(({ url }) => url)).toEqual(['/me/favorites']);
    expect(requests[0]?.params).toBeUndefined();
  });

  it('reads nothing for a guest', async () => {
    setSessionHint(false);
    await restoreSession();
    const requests = fakeTransport(() => ok(FAVORITES));

    const { result } = renderHook(() => useFavoriteIds(), { wrapper: queryWrapper() });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBeNull();
    expect(requests).toHaveLength(0);
  });
});
