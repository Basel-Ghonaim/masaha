import type { SubscriptionState } from '@masaha/shared/subscriptions';
import { describe, expect, it } from 'vitest';

import { progressWithout, subscriptionWarnings } from './limits.ts';

/** An active subscription, three days a week and four hours a day, with nothing used yet. */
function state(more: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    id: 1,
    customerId: 1,
    packageId: null,
    renewalOfId: null,
    name: 'شهري',
    startsOn: '2026-10-01',
    endsOn: '2026-10-30',
    totalDays: null,
    daysPerWeek: 3,
    hoursPerDay: 4,
    totalHours: null,
    billing: 'FIXED',
    priceAgorot: 30_000,
    audience: 'GENERAL',
    shiftId: null,
    priceTyped: null,
    ended: null,
    status: 'ACTIVE',
    progress: { daysUsed: 0, daysThisWeek: 0, minutesUsed: 0, minutesToday: 0 },
    dueAgorot: 30_000,
    ...more,
  };
}

const usage = (daysThisWeek: number, minutesToday: number) => ({
  daysUsed: daysThisWeek,
  daysThisWeek,
  minutesUsed: minutesToday,
  minutesToday,
});

describe('subscriptionWarnings', () => {
  it('none for a running subscription within its limits, or with none', () => {
    expect(
      subscriptionWarnings(state({ progress: usage(2, 239) }), { checkedInToday: false }),
    ).toEqual([]);
    expect(
      subscriptionWarnings(
        state({ daysPerWeek: null, hoursPerDay: null, progress: usage(7, 900) }),
        {
          checkedInToday: false,
        },
      ),
    ).toEqual([]);
  });

  it('each warning alone', () => {
    const notToday = { checkedInToday: false };
    expect(subscriptionWarnings(state({ status: 'UPCOMING' }), notToday)).toEqual([
      'SUBSCRIPTION_NOT_STARTED',
    ]);
    expect(subscriptionWarnings(state({ status: 'EXPIRED' }), notToday)).toEqual([
      'SUBSCRIPTION_EXPIRED',
    ]);
    expect(subscriptionWarnings(state({ progress: usage(3, 0) }), notToday)).toEqual([
      'DAYS_PER_WEEK_USED',
    ]);
    expect(
      subscriptionWarnings(state({ daysPerWeek: null, progress: usage(1, 240) }), notToday),
    ).toEqual(['HOURS_PER_DAY_USED']);
  });

  it('all that apply, in order: the dates first, then the days, then the hours', () => {
    const notToday = { checkedInToday: false };
    expect(
      subscriptionWarnings(state({ status: 'UPCOMING', progress: usage(3, 240) }), notToday),
    ).toEqual(['SUBSCRIPTION_NOT_STARTED', 'DAYS_PER_WEEK_USED', 'HOURS_PER_DAY_USED']);
    expect(
      subscriptionWarnings(state({ status: 'EXPIRED', progress: usage(4, 300) }), notToday),
    ).toEqual(['SUBSCRIPTION_EXPIRED', 'DAYS_PER_WEEK_USED', 'HOURS_PER_DAY_USED']);
  });

  it('the days a week only while today is not counted yet: a second check-in today uses no new day', () => {
    expect(
      subscriptionWarnings(state({ progress: usage(3, 60) }), { checkedInToday: true }),
    ).toEqual([]);
  });

  it('the limits warn at exactly their bound, not before', () => {
    const notToday = { checkedInToday: false };
    expect(subscriptionWarnings(state({ progress: usage(2, 239) }), notToday)).toEqual([]);
    expect(subscriptionWarnings(state({ progress: usage(3, 240) }), notToday)).toEqual([
      'DAYS_PER_WEEK_USED',
      'HOURS_PER_DAY_USED',
    ]);
  });
});

describe('progressWithout', () => {
  const now = { today: '2026-10-21', weekStart: '2026-10-17' };

  it("leaves out an open check-in's day today, its only one", () => {
    expect(
      progressWithout(
        { daysUsed: 5, daysThisWeek: 3, minutesUsed: 600, minutesToday: 0 },
        { day: '2026-10-21', minutes: null, dayShared: false },
        now,
      ),
    ).toEqual({ daysUsed: 4, daysThisWeek: 2, minutesUsed: 600, minutesToday: 0 });
  });

  it("keeps a day another check-in shares, and leaves out a closed one's minutes", () => {
    expect(
      progressWithout(
        { daysUsed: 5, daysThisWeek: 3, minutesUsed: 600, minutesToday: 150 },
        { day: '2026-10-21', minutes: 90, dayShared: true },
        now,
      ),
    ).toEqual({ daysUsed: 5, daysThisWeek: 3, minutesUsed: 510, minutesToday: 60 });
  });

  it("a day before the week leaves the week's and today's counts as they are", () => {
    expect(
      progressWithout(
        { daysUsed: 5, daysThisWeek: 3, minutesUsed: 600, minutesToday: 150 },
        { day: '2026-10-16', minutes: 90, dayShared: false },
        now,
      ),
    ).toEqual({ daysUsed: 4, daysThisWeek: 3, minutesUsed: 510, minutesToday: 150 });
  });
});
