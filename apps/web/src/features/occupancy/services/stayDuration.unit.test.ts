import { describe, expect, it } from 'vitest';
import { stayDuration } from './stayDuration';

const SINCE = '2026-10-24T07:00:00.000Z';

describe('stayDuration', () => {
  it('counts a stay in whole hours and minutes, the last minute not yet full left out', () => {
    expect(stayDuration(SINCE, new Date('2026-10-24T09:05:59.000Z'))).toEqual({
      hours: 2,
      minutes: 5,
    });
  });

  it('is 0 minutes at the check-in, and never below it', () => {
    expect(stayDuration(SINCE, new Date(SINCE))).toEqual({ hours: 0, minutes: 0 });
    expect(stayDuration(SINCE, new Date('2026-10-24T06:59:00.000Z'))).toEqual({
      hours: 0,
      minutes: 0,
    });
  });
});
