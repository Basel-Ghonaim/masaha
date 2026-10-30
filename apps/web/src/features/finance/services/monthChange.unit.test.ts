import { describe, expect, it } from 'vitest';
import { monthChange } from './monthChange';

describe('monthChange', () => {
  it('says +12% over the month before, rounded', () => {
    expect(monthChange(11_200, 10_000)).toBe('+12%');
    expect(monthChange(9_100, 10_000)).toBe('-9%');
  });

  it('says nothing when the month before had no income', () => {
    expect(monthChange(5_000, 0)).toBeNull();
  });
});
