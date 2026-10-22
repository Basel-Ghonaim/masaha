import { renderHook, waitFor } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useLiveStatusQuery } from './useLiveStatusQuery';

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

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    focusManager.setFocused(false);
    vi.advanceTimersByTime(60_000);
    expect(requests).toHaveLength(2);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    focusManager.setFocused(true);
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
  });
});
