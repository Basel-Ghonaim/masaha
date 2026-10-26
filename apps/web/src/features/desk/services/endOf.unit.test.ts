import { describe, expect, it } from 'vitest';
import { endOf } from './endOf';

describe('endOf', () => {
  it('ends a subscription of 30 days from the 1st on the 30th, both days counted', () => {
    expect(endOf('2026-11-01', 30)).toBe('2026-11-30');
    expect(endOf('2026-11-01', 1)).toBe('2026-11-01');
    expect(endOf('2026-12-25', 7)).toBe('2026-12-31');
    expect(endOf('2027-02-20', 10)).toBe('2027-03-01');
  });
});
