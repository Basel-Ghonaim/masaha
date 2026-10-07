import { describe, expect, it } from 'vitest';
import { updatedOn } from './updatedOn';

const NOW = new Date('2026-10-07T09:00:00Z');

describe('updatedOn', () => {
  it('gives the day and the month in each language, with Western digits', () => {
    expect(updatedOn('2026-09-27T08:00:00Z', 'en', NOW)).toBe('27 Sept');
    expect(updatedOn('2026-09-27T08:00:00Z', 'ar', NOW)).toBe('27 سبتمبر');
  });

  it('dates by Gaza’s day, not the server’s', () => {
    // 22:30 UTC on the 26th is already the 27th in Gaza.
    expect(updatedOn('2026-09-26T22:30:00Z', 'en', NOW)).toBe('27 Sept');
  });

  it('adds the year when it is not the current one', () => {
    expect(updatedOn('2025-05-30T08:00:00Z', 'en', NOW)).toBe('30 May 2025');
    expect(updatedOn('2025-05-30T08:00:00Z', 'ar', NOW)).toBe('30 مايو 2025');
  });

  it('counts the year by Gaza’s day too', () => {
    // The first minutes of 2027 in Gaza are still 2026 in UTC.
    expect(updatedOn('2026-12-31T22:30:00Z', 'en', new Date('2027-01-02T09:00:00Z'))).toBe('1 Jan');
  });
});
