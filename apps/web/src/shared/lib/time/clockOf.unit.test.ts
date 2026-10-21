import { describe, expect, it } from 'vitest';
import { clockOf } from './clockOf';

describe('clockOf', () => {
  it('writes a minute of the day as a 24-hour time, the day’s end as 24:00', () => {
    expect(clockOf(0)).toBe('00:00');
    expect(clockOf(510)).toBe('08:30');
    expect(clockOf(1110)).toBe('18:30');
    expect(clockOf(1440)).toBe('24:00');
  });
});
