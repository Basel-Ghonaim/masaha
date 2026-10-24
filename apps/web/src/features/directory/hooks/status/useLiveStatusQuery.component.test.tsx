import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useLiveStatusQuery } from './useLiveStatusQuery';

/** Hides or shows the page as the browser does: its visibility, then the event it sends. */
function showPage(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  if (state === 'visible') window.dispatchEvent(new Event('focus'));
}

describe('useLiveStatusQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    restoreTransport();
    vi.useRealTimers();
  });

  it('refreshes every 60 seconds while visible and immediately on focus', async () => {
    const requests: string[] = [];
    fakeTransport((request) => {
      if (request.url !== undefined) requests.push(request.url);
      return ok({ status: 'AVAILABLE' });
    });
    const { result } = renderHook(() => useLiveStatusQuery('noor-hub'), {
      wrapper: queryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ status: 'AVAILABLE' });
    });
    expect(requests).toEqual(['/spaces/noor-hub/occupancy']);
    vi.advanceTimersByTime(59_999);
    expect(requests).toHaveLength(1);
    vi.advanceTimersByTime(1);
    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });

    showPage('hidden');
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(100);
    expect(requests).toHaveLength(2);
    showPage('visible');
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });

    // Back at once, the status just read is still fresh, and is read again all the same.
    showPage('hidden');
    showPage('visible');
    await waitFor(() => {
      expect(requests).toHaveLength(4);
    });
  });
});
