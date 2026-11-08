import type { MapPin } from '@masaha/shared/directory';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { startPreferences } from '../../../../test/startPreferences';
import { nearMeStore } from '../near/nearMeStore';
import { useDirectoryMap } from './useDirectoryMap';

const pin = (id: number): MapPin => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: `مساحة ${String(id)}`,
  areaId: 2,
  location: { lat: 31.5 + id / 1000, lng: 34.45 },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: 'AVAILABLE',
  hoursStatus: null,
});

/** The map's answer, as the server gives it. */
const pins = (list: MapPin[], truncated = false) =>
  ({
    status: 200,
    data: { success: true, data: { pins: list, truncated } },
  }) satisfies FakeAnswer;

/** The map at `path`, the fake server answering each request with `answer`. */
function renderMap(path: string, answer: Parameters<typeof fakeTransport>[0]) {
  stubScreenWidth(1440);
  const requests = fakeTransport(answer);
  const Query = queryWrapper();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Query>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </Query>
  );
  const rendered = renderHook(() => ({ view: useDirectoryMap(), search: useLocation().search }), {
    wrapper,
  });
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDirectoryMap', () => {
  it('keeps the same marks while a search is typed, before any new answer', async () => {
    const { result } = renderMap('/spaces?view=map', () => pins([pin(1), pin(2)]));
    await waitFor(() => {
      expect(result.current.view.map.markers).toHaveLength(2);
    });
    const marks = result.current.view.map.markers;

    act(() => {
      result.current.view.search.change('ن');
    });

    expect(result.current.view.search.text).toBe('ن');
    expect(result.current.view.map.markers).toBe(marks);
  });

  it('asks for the pins with the list’s filters; a change of filter clears the selection', async () => {
    const { result, requests } = renderMap('/spaces?view=map&verified=1&q=Hub&sort=name', () =>
      pins([pin(1), pin(2)]),
    );
    await waitFor(() => {
      expect(result.current.view.state).toBe('ready');
    });
    expect(requests[0]).toMatchObject({
      url: '/map/spaces',
      params: { verified: true, q: 'Hub' },
    });
    expect(requests[0]?.params).toEqual({ verified: true, q: 'Hub' });
    expect(result.current.view.map.markers.map((marker) => marker.label)).toEqual([
      'مساحة 1 — متاح',
      'مساحة 2 — متاح',
    ]);
    expect(result.current.view.map.markers[0]?.mark).toEqual({ shape: 'filled', tone: 'success' });

    act(() => {
      result.current.view.map.onSelect(2);
    });
    expect(result.current.view.map.selectedId).toBe(2);
    expect(result.current.view.selected?.card.slug).toBe('space-2');
    expect(result.current.view.map.focus).toEqual({
      point: { lat: 31.502, lng: 34.45 },
      place: 'centre',
    });

    act(() => {
      result.current.view.filters.hours.items.find(({ key }) => key === 'openNow')?.toggle(true);
    });
    await waitFor(() => {
      expect(requests.at(-1)?.params).toEqual({ verified: true, q: 'Hub', openNow: true });
    });
    expect(result.current.view.map.selectedId).toBeNull();
    expect(result.current.view.selected).toBeNull();
    expect(result.current.search).toBe('?q=Hub&open=1&verified=1&sort=name&view=map');
  });

  it('names an unverified pin by its state by its hours, its mark the dashed one of no live status; asks with the hours filters', async () => {
    const unverified = (id: number, hoursStatus: MapPin['hoursStatus']): MapPin => ({
      ...pin(id),
      isVerified: false,
      liveStatus: null,
      hoursStatus,
    });
    const { result, requests } = renderMap('/spaces?view=map&open=1&evening=1', () =>
      pins([unverified(1, 'OPEN'), unverified(2, 'CLOSED'), unverified(3, null), pin(4)]),
    );
    await waitFor(() => {
      expect(result.current.view.map.markers).toHaveLength(4);
    });

    expect(requests[0]?.params).toEqual({ openNow: true, evening: true });
    expect(result.current.view.map.markers.map(({ label }) => label)).toEqual([
      'مساحة 1 — مفتوحة الآن',
      'مساحة 2 — مغلقة الآن',
      'مساحة 3 — لا تتوفر حالة مباشرة',
      'مساحة 4 — متاح',
    ]);
    const [open, , none] = result.current.view.map.markers;
    expect(open?.mark).toEqual(none?.mark);
  });

  it('past 1,000 pins says so and asks again within the box in view, after a pause', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result, requests } = renderMap('/spaces?view=map', (request) =>
      (request.params as { bounds?: string }).bounds === undefined
        ? pins([pin(1), pin(2)], true)
        : pins([pin(3)]),
    );
    await waitFor(() => {
      expect(result.current.view.state).toBe('ready');
    });
    // The server's ceiling, formatted for the language.
    expect(result.current.view.truncated).toBe('تظهر أول 1,000 مساحة؛ قرّب الخريطة لترى ما بقي.');
    const onViewChange = result.current.view.map.onViewChange;
    expect(onViewChange).not.toBeNull();

    act(() => {
      onViewChange?.({ south: 31.4, west: 34.3, north: 31.55, east: 34.5 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(requests).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(result.current.view.map.markers.map((marker) => marker.id)).toEqual([3]);
    });
    expect(requests.at(-1)?.params).toEqual({ bounds: '31.4,34.3,31.55,34.5' });
    expect(result.current.view.truncated).toBeNull();
  });

  it('while a point is picked, hands no box back, so the centre is never sent', async () => {
    const { result } = renderMap('/spaces?view=map', () => pins([pin(1), pin(2)], true));
    await waitFor(() => {
      expect(result.current.view.map.onViewChange).not.toBeNull();
    });

    act(() => {
      nearMeStore.startPick();
    });
    expect(result.current.view.map.pick).not.toBeNull();
    expect(result.current.view.map.onViewChange).toBeNull();
  });

  it('asks only once when the whole set fits, and hands no box back', async () => {
    const { result, requests } = renderMap('/spaces?view=map', () => pins([pin(1)]));
    await waitFor(() => {
      expect(result.current.view.state).toBe('ready');
    });
    expect(result.current.view.truncated).toBeNull();
    expect(result.current.view.map.onViewChange).toBeNull();
    expect(requests).toHaveLength(1);
  });
});
