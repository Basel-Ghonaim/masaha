import { describe, expect, it } from 'vitest';

import { overrideUntil } from './overrideUntil.ts';

const NOW = new Date('2026-10-18T07:00:00Z');
const CLOSES_LATE = new Date('2026-10-18T15:00:00Z');
const CLOSES_SOON = new Date('2026-10-18T07:45:00Z');

describe('overrideUntil', () => {
  it('each duration ends after its time, or at closing when closing comes first', () => {
    expect(overrideUntil('MINUTES_30', NOW, CLOSES_LATE)).toEqual(new Date('2026-10-18T07:30:00Z'));
    expect(overrideUntil('HOUR_1', NOW, CLOSES_LATE)).toEqual(new Date('2026-10-18T08:00:00Z'));
    expect(overrideUntil('HOURS_2', NOW, CLOSES_LATE)).toEqual(new Date('2026-10-18T09:00:00Z'));

    expect(overrideUntil('MINUTES_30', NOW, CLOSES_SOON)).toEqual(new Date('2026-10-18T07:30:00Z'));
    expect(overrideUntil('HOUR_1', NOW, CLOSES_SOON)).toEqual(CLOSES_SOON);
    expect(overrideUntil('HOURS_2', NOW, CLOSES_SOON)).toEqual(CLOSES_SOON);
  });

  it('until closing ends at closing', () => {
    expect(overrideUntil('UNTIL_CLOSING', NOW, CLOSES_LATE)).toEqual(CLOSES_LATE);
    expect(overrideUntil('UNTIL_CLOSING', NOW, CLOSES_SOON)).toEqual(CLOSES_SOON);
  });
});
