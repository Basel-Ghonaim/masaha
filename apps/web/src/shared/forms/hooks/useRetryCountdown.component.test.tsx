import { AppError } from '@shared/errors';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetryCountdown } from './useRetryCountdown';

function rateLimit(retryAfterSeconds?: number) {
  return new AppError({ type: 'rate_limit', status: 429, retryAfterSeconds, message: 'Fake' });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRetryCountdown', () => {
  it('counts the wait of a rate_limit failure down to 0, one second at a time', () => {
    const failure = rateLimit(3);
    const { result } = renderHook(() => useRetryCountdown(failure));
    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(0);
  });

  it.each([
    ['no failure', null],
    ['another failure', new AppError({ type: 'network', status: 0, message: 'Fake' })],
    ['a rate_limit without Retry-After', rateLimit()],
  ])('waits 0 for %s', (_case, failure) => {
    const { result } = renderHook(() => useRetryCountdown(failure));

    expect(result.current).toBe(0);
  });

  it('starts a new count for a new failure', () => {
    const { result, rerender } = renderHook(({ failure }) => useRetryCountdown(failure), {
      initialProps: { failure: rateLimit(5) },
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current).toBe(1);

    rerender({ failure: rateLimit(60) });

    expect(result.current).toBe(60);
  });
});
