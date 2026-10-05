import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResendCountdown } from './useResendCountdown';

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useResendCountdown', () => {
  it('counts the window down from when the server answered it, to 0', () => {
    const readAt = Date.now();
    const { result } = renderHook(() => useResendCountdown(3, readAt));

    expect(result.current).toBe(3);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it('counts what is left of a window read earlier, as after coming back to the page', () => {
    const readAt = Date.now() - 20_000;

    const { result } = renderHook(() => useResendCountdown(60, readAt));

    expect(result.current).toBe(40);
  });

  it('starts a new answer’s window again', () => {
    const first = Date.now();
    const { result, rerender } = renderHook(
      ({ seconds, since }) => useResendCountdown(seconds, since),
      { initialProps: { seconds: 60, since: first } },
    );
    act(() => {
      vi.advanceTimersByTime(50_000);
    });
    expect(result.current).toBe(10);

    rerender({ seconds: 60, since: Date.now() });

    expect(result.current).toBe(60);
  });

  it('has nothing to wait for with no window', () => {
    const readAt = Date.now();
    const { result } = renderHook(() => useResendCountdown(0, readAt));

    expect(result.current).toBe(0);
  });
});
