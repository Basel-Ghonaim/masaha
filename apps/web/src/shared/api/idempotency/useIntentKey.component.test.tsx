import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIntentKey } from './useIntentKey';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('useIntentKey', () => {
  it('keeps one key across renders until renewed, then gives a new one', () => {
    const { result, rerender } = renderHook(() => useIntentKey());
    const first = result.current.key;

    expect(first).toMatch(UUID);
    rerender();
    rerender();
    expect(result.current.key).toBe(first);

    act(() => {
      result.current.renew();
    });

    expect(result.current.key).toMatch(UUID);
    expect(result.current.key).not.toBe(first);
    const second = result.current.key;
    rerender();
    expect(result.current.key).toBe(second);
  });
});
