import type { DirectorySpace, FavoriteSpace } from '@masaha/shared/directory';
import { createQueryClient } from '@shared/api';
import { establishSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../near/nearMeStore';
import { useFavoritesView } from './useFavoritesView';

function space(id: number, nameEn: string): DirectorySpace {
  return {
    id,
    slug: nameEn.toLowerCase().replace(' ', '-'),
    nameEn,
    nameAr: null,
    area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    isVerified: true,
    days: null,
    cover: null,
    liveStatus: 'AVAILABLE',
  };
}

const NEWEST: FavoriteSpace[] = [
  { listed: true, savedAt: '2026-10-27T09:00:00.000Z', space: space(7, 'Masaha Hub') },
  {
    listed: false,
    savedAt: '2026-10-26T09:00:00.000Z',
    space: { id: 9, nameEn: 'Old Hub', nameAr: 'المساحة القديمة' },
  },
  { listed: true, savedAt: '2026-10-25T09:00:00.000Z', space: space(8, 'Noor Hub') },
];

const NEAREST: FavoriteSpace[] = [
  {
    listed: true,
    savedAt: '2026-10-25T09:00:00.000Z',
    space: { ...space(8, 'Noor Hub'), distanceMeters: 700 },
  },
  {
    listed: true,
    savedAt: '2026-10-27T09:00:00.000Z',
    space: { ...space(7, 'Masaha Hub'), distanceMeters: 2300 },
  },
  {
    listed: false,
    savedAt: '2026-10-26T09:00:00.000Z',
    space: { id: 9, nameEn: 'Old Hub', nameAr: 'المساحة القديمة' },
  },
];

/** «المفضّلة»'s view, answered by `answer`. */
function renderView(answer: Parameters<typeof fakeTransport>[0]) {
  const requests = fakeTransport(answer);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useFavoritesView({ chooseArea: vi.fn(), openMap: vi.fn() }), {
    wrapper,
  });
  return { ...view, requests, client };
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-28T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  nearMeStore.clear();
});

describe('useFavoritesView', () => {
  it('shows the listed spaces newest saved first as cards, the ones that left after them by name', async () => {
    const { result, requests } = renderView(() => ok(NEWEST));

    expect(result.current.state).toBe('loading');
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
    expect(result.current.count).toBe('3 saved spaces');
    expect(result.current.cards.map((card) => card.name.text)).toEqual(['Masaha Hub', 'Noor Hub']);
    expect(result.current.cards.map((card) => card.distance)).toEqual([null, null]);
    expect(result.current.unlisted).toEqual([
      {
        key: '9',
        id: 9,
        name: { text: 'Old Hub' },
        line: 'This space is no longer listed in the directory',
      },
    ]);
    expect(requests[0]?.url).toBe('/me/favorites');
    expect(requests[0]?.params).toBeUndefined();
    expect(requests[0]?.headers['Masaha-Near']).toBeUndefined();
  });

  it('sorts nearest first while near me holds a point, sent in the header only; clearing it drops that answer', async () => {
    const { result, requests, client } = renderView((request) =>
      request.headers['Masaha-Near'] === undefined ? ok(NEWEST) : ok(NEAREST),
    );
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    act(() => {
      nearMeStore.granted({ lat: 31.521, lng: 34.453 }, 'device');
    });

    await waitFor(() => {
      expect(result.current.cards.map((card) => card.name.text)).toEqual([
        'Noor Hub',
        'Masaha Hub',
      ]);
    });
    expect(result.current.near.button.on).toBe(true);
    expect(result.current.cards[0]?.distance).toContain('0.7');
    expect(result.current.unlisted.map((each) => each.key)).toEqual(['9']);
    expect(requests.at(-1)?.params).toEqual({ sort: 'distance' });
    expect(requests.at(-1)?.headers['Masaha-Near']).toBe('31.521,34.453');

    act(() => {
      if (result.current.near.status.kind === 'granted') result.current.near.status.clear.run();
    });
    await waitFor(() => {
      expect(result.current.cards.map((card) => card.name.text)).toEqual([
        'Masaha Hub',
        'Noor Hub',
      ]);
    });
    expect(client.getQueryCache().findAll({ queryKey: ['me', 'favorites'] })).toHaveLength(1);
  });

  it('says none is saved, with «Browse spaces»', async () => {
    const { result } = renderView(() => ok([]));

    await waitFor(() => {
      expect(result.current.state).toBe('empty');
    });
    expect(result.current.count).toBe('0 saved spaces');
    expect(result.current.empty).toEqual({
      title: 'You haven’t saved any spaces yet',
      text: 'Tap the heart on any space’s page to find it here.',
      browse: 'Browse spaces',
    });
  });

  it('fails with its reference and a retry', async () => {
    let answer: FakeAnswer = refused(403, { type: 'forbidden' });
    const { result } = renderView(() => answer);

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });
    expect(result.current.failure).toMatchObject({
      title: 'We couldn’t load your favourites',
      reference: expect.stringContaining('req-1') as unknown,
    });

    answer = ok(NEWEST);
    act(() => {
      result.current.failure?.retry.run();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });
  });
});
