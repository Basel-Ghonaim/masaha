import { describe, expect, it } from 'vitest';
import { quoteIsStale } from './quoteAge';

const AT = '2026-07-01T09:00:00.000Z';
const after = (minutes: number, seconds = 0) =>
  new Date(new Date(AT).getTime() + (minutes * 60 + seconds) * 1000);

describe('quoteIsStale', () => {
  it('is stale once older than 4 minutes', () => {
    expect(quoteIsStale(AT, after(4, 1))).toBe(true);
    expect(quoteIsStale(AT, after(10))).toBe(true);
  });

  it('is not at 3:59, nor at 4:00 itself', () => {
    expect(quoteIsStale(AT, after(3, 59))).toBe(false);
    expect(quoteIsStale(AT, after(4))).toBe(false);
  });
});
