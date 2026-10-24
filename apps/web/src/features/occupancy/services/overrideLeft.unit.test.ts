import { describe, expect, it } from 'vitest';
import { overrideLeft } from './overrideLeft';

const NOW = new Date('2026-10-24T10:00:00.000Z');

describe('overrideLeft', () => {
  it('says an override’s 84 minutes left as «1:24»', () => {
    expect(overrideLeft('2026-10-24T11:24:00.000Z', NOW)).toBe('1:24');
  });

  it('rounds a part of a minute up, so it never reads 0:00 while it is in force', () => {
    expect(overrideLeft('2026-10-24T11:23:30.000Z', NOW)).toBe('1:24');
    expect(overrideLeft('2026-10-24T10:00:01.000Z', NOW)).toBe('0:01');
  });

  it('reads 0:00 once it has ended', () => {
    expect(overrideLeft('2026-10-24T09:59:00.000Z', NOW)).toBe('0:00');
  });
});
