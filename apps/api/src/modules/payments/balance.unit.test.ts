import { describe, expect, it } from 'vitest';

import { balanceOf } from './balance.ts';

describe('balanceOf', () => {
  it('is the due less what was paid; no due, no balance', () => {
    expect(balanceOf(2_000, 0)).toBe(2_000);
    expect(balanceOf(2_000, 500)).toBe(1_500);
    expect(balanceOf(2_000, 2_000)).toBe(0);
    expect(balanceOf(null, 0)).toBeNull();
    expect(balanceOf(null, 500)).toBeNull();
  });
});
