import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeGeolocation } from '../../../../test/fakeGeolocation';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { directoryKeys } from '../queryKeys';
import { nearMeStore } from './nearMeStore';
import { useNearMe } from './useNearMe';

function renderNearMe() {
  const Query = queryWrapper();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Query>
      <MemoryRouter initialEntries={['/spaces']}>{children}</MemoryRouter>
    </Query>
  );
  return renderHook(
    () => ({ near: useNearMe(), search: useLocation().search, client: useQueryClient() }),
    { wrapper },
  );
}

/** Every value the browser's storage holds. */
function stored(): string {
  return [localStorage, sessionStorage]
    .flatMap((storage) => Object.keys(storage).map((key) => storage.getItem(key) ?? ''))
    .join(' ');
}

beforeEach(() => {
  startPreferences('ar');
  nearMeStore.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useNearMe', () => {
  it('asks for the location only when the button is pressed', () => {
    const device = fakeGeolocation();
    const { result } = renderNearMe();
    expect(device.asks).toHaveLength(0);
    expect(result.current.near.state.status).toBe('idle');

    act(() => {
      result.current.near.press();
    });

    expect(device.asks).toHaveLength(1);
    expect(device.asks[0]?.options).toEqual({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300_000,
    });
    expect(result.current.near.state.status).toBe('locating');
  });

  it('keeps only the rounded point, in memory: nothing in the address, nor in local or session storage', () => {
    const device = fakeGeolocation();
    const { result } = renderNearMe();

    act(() => {
      result.current.near.press();
    });
    act(() => {
      device.succeed(31.501_234, 34.466_789, 30);
    });

    expect(result.current.near.state).toEqual({
      status: 'granted',
      point: { lat: 31.501, lng: 34.467 },
      source: 'device',
      sorting: true,
    });
    expect(result.current.search).toBe('');
    expect(stored()).not.toMatch(/31\.50|34\.46/);
  });

  it('a refusal or an imprecise position says so and keeps nothing', () => {
    const device = fakeGeolocation();
    const { result } = renderNearMe();

    act(() => {
      result.current.near.press();
    });
    act(() => {
      device.fail();
    });
    expect(result.current.near.state).toMatchObject({
      status: 'denied',
      point: null,
      sorting: false,
    });

    act(() => {
      result.current.near.press();
    });
    act(() => {
      device.succeed(31.5, 34.46, 5000);
    });
    expect(result.current.near.state).toMatchObject({
      status: 'imprecise',
      point: null,
      sorting: false,
    });

    act(() => {
      result.current.near.press();
    });
    act(() => {
      device.succeed(30.044, 31.236, 20);
    });
    expect(result.current.near.state).toMatchObject({ status: 'imprecise', point: null });
  });

  it('ends asking as denied when no answer comes within 15 s, and drops an answer that comes after', () => {
    vi.useFakeTimers();
    const device = fakeGeolocation();
    const { result } = renderNearMe();

    act(() => {
      result.current.near.press();
    });
    act(() => {
      vi.advanceTimersByTime(14_999);
    });
    expect(result.current.near.state.status).toBe('locating');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.near.state).toMatchObject({ status: 'denied', point: null });

    act(() => {
      device.succeed(31.5, 34.46, 30);
    });
    expect(result.current.near.state).toMatchObject({ status: 'denied', point: null });
  });

  it('stopping keeps the point; clearing drops it and every answer ordered by distance', () => {
    const device = fakeGeolocation();
    const { result } = renderNearMe();
    act(() => {
      result.current.near.press();
    });
    act(() => {
      device.succeed(31.5, 34.46, 30);
    });
    const point = { lat: 31.5, lng: 34.46 };
    const byDistance = directoryKeys.list({ limit: 20, sort: 'distance' }, point);
    const byUpdate = directoryKeys.list({ limit: 20 }, null);
    result.current.client.setQueryData(byDistance, { data: [], meta: {} });
    result.current.client.setQueryData(byUpdate, { data: [], meta: {} });

    act(() => {
      result.current.near.stop();
    });
    expect(result.current.near.state).toMatchObject({ status: 'granted', point, sorting: false });
    act(() => {
      result.current.near.press();
    });
    expect(result.current.near.state).toMatchObject({ point, sorting: true });
    expect(device.asks).toHaveLength(1);

    act(() => {
      result.current.near.clear();
    });
    expect(result.current.near.state).toEqual({
      status: 'idle',
      point: null,
      source: null,
      sorting: false,
    });
    expect(result.current.client.getQueryData(byDistance)).toBeUndefined();
    expect(result.current.client.getQueryData(byUpdate)).toBeDefined();
  });
});
