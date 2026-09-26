import { describe, expect, it } from 'vitest';

describe('unit lane', () => {
  it('runs without a DOM', () => {
    expect(typeof document).toBe('undefined');
  });
});
