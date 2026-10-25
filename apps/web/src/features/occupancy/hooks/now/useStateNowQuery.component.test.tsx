import type { SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useStateNowQuery } from './useStateNowQuery';

const NOW: SpaceOccupancyNow = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 0,
  override: null,
  people: [],
};

let visibility: DocumentVisibilityState = 'visible';

/** The page hidden or shown again, as the browser says it when the tab changes. */
function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  window.dispatchEvent(new Event('visibilitychange'));
}

const elapse = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
});

describe('useStateNowQuery', () => {
  it('reads again every 30 s while visible, never while hidden, and at once on returning', async () => {
    const requests = fakeTransport(() => ok(NOW));
    const { result } = renderHook(() => useStateNowQuery(7), { wrapper: queryWrapper() });
    const reads = () => requests.filter(({ url }) => url === '/manage/spaces/7/occupancy').length;

    await vi.waitFor(() => {
      expect(result.current.data).toEqual(NOW);
    });
    expect(reads()).toBe(1);

    await elapse(30_000);
    await vi.waitFor(() => {
      expect(reads()).toBe(2);
    });

    setVisibility('hidden');
    await elapse(90_000);
    expect(reads()).toBe(2);

    setVisibility('visible');
    await vi.waitFor(() => {
      expect(reads()).toBe(3);
    });
  });
});
