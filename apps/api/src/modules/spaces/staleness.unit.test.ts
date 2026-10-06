import { describe, expect, it } from 'vitest';

import { lastUpdate, staleCutoffs, staleGroups, type GroupDates } from './staleness.ts';

const NOW = new Date('2026-10-06T12:00:00Z');
const THRESHOLDS = { stalenessDays: 60, priceStalenessDays: 30 };

/** A date `days` before now. */
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

/** Every group dated `days` ago, with some overridden. */
function dated(days: number, overrides: Partial<GroupDates> = {}): GroupDates {
  return {
    profile: daysAgo(days),
    hours: daysAgo(days),
    prices: daysAgo(days),
    amenities: daysAgo(days),
    contacts: daysAgo(days),
    ...overrides,
  };
}

describe('staleCutoffs', () => {
  it('puts the prices’ cut-off at their own threshold and every other group’s at the general one', () => {
    expect(staleCutoffs(THRESHOLDS, NOW)).toEqual(dated(60, { prices: daysAgo(30) }));
  });
});

describe('staleGroups', () => {
  const cutoffs = staleCutoffs(THRESHOLDS, NOW);

  it('finds no stale group on a space updated today', () => {
    expect(staleGroups(dated(0), cutoffs)).toEqual([]);
  });

  it('finds the prices stale after 30 days, while the other groups are still fresh', () => {
    expect(staleGroups(dated(31), cutoffs)).toEqual(['prices']);
  });

  it('finds every group stale after 60 days, in the groups’ order', () => {
    expect(staleGroups(dated(61), cutoffs)).toEqual([
      'profile',
      'hours',
      'prices',
      'amenities',
      'contacts',
    ]);
  });

  it('holds a group dated exactly at its cut-off fresh', () => {
    expect(staleGroups(dated(0, { hours: daysAgo(60), prices: daysAgo(30) }), cutoffs)).toEqual([]);
  });
});

describe('lastUpdate', () => {
  it('is the latest of the groups’ dates', () => {
    expect(lastUpdate(dated(90, { contacts: daysAgo(3), hours: daysAgo(10) }))).toEqual(daysAgo(3));
  });
});
