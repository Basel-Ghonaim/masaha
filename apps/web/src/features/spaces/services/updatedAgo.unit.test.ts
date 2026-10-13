import { describe, expect, it } from 'vitest';
import { updatedAgo } from './updatedAgo';

// 10:00 in Gaza (UTC+3 in October).
const NOW = new Date('2026-10-13T07:00:00Z');

describe('updatedAgo', () => {
  it.each([
    ['2026-10-13T06:00:00Z', 'en', 'today'],
    ['2026-10-12T06:00:00Z', 'en', 'yesterday'],
    ['2026-10-11T06:00:00Z', 'en', '2 days ago'],
    ['2026-10-02T06:00:00Z', 'en', '11 days ago'],
    ['2026-10-13T06:00:00Z', 'ar', 'اليوم'],
    ['2026-10-12T06:00:00Z', 'ar', 'أمس'],
    ['2026-10-11T06:00:00Z', 'ar', 'أول أمس'],
    ['2026-10-02T06:00:00Z', 'ar', 'قبل 11 يومًا'],
  ] as const)('%s in %s is %s', (iso, language, expected) => {
    expect(updatedAgo(iso, language, NOW)).toBe(expected);
  });

  it('counts days on Gaza’s calendar: 22:30 UTC the day before is already today there', () => {
    expect(updatedAgo('2026-10-12T22:30:00Z', 'en', NOW)).toBe('today');
  });
});
