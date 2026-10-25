import { describe, expect, it } from 'vitest';
import { dayWord } from './dayWord';

const WORDS = { today: 'today', yesterday: 'yesterday' };

describe('dayWord', () => {
  it('says today and yesterday on Gaza’s calendar, else the date', () => {
    const now = new Date('2026-10-07T10:00:00.000Z');

    expect(dayWord('2026-10-07T05:00:00.000Z', now, 'en', WORDS)).toBe('today');
    expect(dayWord('2026-10-06T19:00:00.000Z', now, 'en', WORDS)).toBe('yesterday');
    expect(dayWord('2026-10-04T12:00:00.000Z', now, 'en', WORDS)).toBe('4 Oct');
    expect(dayWord('2026-10-04T12:00:00.000Z', now, 'ar', WORDS)).toBe('4 أكتوبر');
    expect(dayWord('2025-12-30T12:00:00.000Z', now, 'en', WORDS)).toBe('30 Dec 2025');
  });

  it('counts the day in Gaza, not in UTC', () => {
    // 22:30 UTC on the 6th is 01:30 on the 7th in Gaza (UTC+3 in October).
    const now = new Date('2026-10-07T09:00:00.000Z');
    expect(dayWord('2026-10-06T22:30:00.000Z', now, 'en', WORDS)).toBe('today');
    // 21:30 UTC on the 7th is the 8th in Gaza: "yesterday" from the 9th there.
    expect(
      dayWord('2026-10-07T21:30:00.000Z', new Date('2026-10-09T08:00:00.000Z'), 'en', WORDS),
    ).toBe('yesterday');
  });
});
