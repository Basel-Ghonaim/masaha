import { describe, expect, it } from 'vitest';
import { financeMonths } from './months';

describe('financeMonths', () => {
  it('lists the current Gaza month and the 23 before it, newest first', () => {
    // 01:30 on 1 October in Gaza; still 30 September in the lane's zone and in UTC.
    const months = financeMonths(new Date('2026-09-30T22:30:00.000Z'));

    expect(months).toHaveLength(24);
    expect(months[0]).toBe('2026-10');
    expect(months[1]).toBe('2026-09');
    expect(months[12]).toBe('2025-10');
    expect(months[23]).toBe('2024-11');
  });
});
