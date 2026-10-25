import type { SubscriptionState } from '@masaha/shared/subscriptions';
import { describe, expect, it } from 'vitest';
import { progressLines } from './progressLines';

const WORDS = {
  days: ({ used, total }: { used: string; total: string }) => `Days ${used} of ${total}`,
  week: ({ used, total }: { used: string; total: string }) => `This week ${used} of ${total}`,
  today: ({ used, total }: { used: string; total: string }) => `Today ${used} of ${total} h`,
  hours: ({ used, total }: { used: string; total: string }) => `Hours ${used} of ${total} h`,
  billed: ({ rate, unit }: { rate: string; unit: string }) =>
    `Billed from attendance: ${rate} ${unit}`,
  units: { PER_HOUR: 'per hour', PER_DAY: 'per day' },
  validUntil: ({ date }: { date: string }) => `Valid until ${date}`,
  endedOn: ({ date }: { date: string }) => `Ended ${date}`,
  startsOn: ({ date }: { date: string }) => `Starts ${date}`,
  noEnd: 'No end date',
};
const plain = {
  price: (agorot: number) => `₪${String(agorot / 100)}`,
  day: (date: string) => date,
};

function subscription(change: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    id: 1,
    customerId: 4,
    packageId: 4,
    renewalOfId: null,
    name: 'Mornings',
    startsOn: '2026-10-01',
    endsOn: '2026-10-30',
    totalDays: null,
    daysPerWeek: null,
    hoursPerDay: null,
    totalHours: null,
    billing: 'FIXED',
    priceAgorot: 15000,
    audience: 'GENERAL',
    shiftId: null,
    priceTyped: null,
    ended: null,
    status: 'ACTIVE',
    progress: { daysUsed: 4, daysThisWeek: 2, minutesUsed: 150, minutesToday: 90 },
    dueAgorot: 15000,
    ...change,
  };
}

describe('progressLines', () => {
  it('says each limit, in order, then the end', () => {
    expect(
      progressLines(
        subscription({ totalDays: 12, daysPerWeek: 3, hoursPerDay: 4, totalHours: 20 }),
        WORDS,
        plain,
      ),
    ).toEqual([
      'Days 4 of 12',
      'This week 2 of 3',
      'Today 1:30 of 4 h',
      'Hours 2:30 of 20 h',
      'Valid until 2026-10-30',
    ]);
  });

  it('says a usage-based subscription’s rate before its end', () => {
    expect(
      progressLines(subscription({ billing: 'PER_HOUR', priceAgorot: 400 }), WORDS, plain),
    ).toEqual(['Billed from attendance: ₪4 per hour', 'Valid until 2026-10-30']);
  });

  it('says an expired one’s end, a coming one’s start, and an open one’s none', () => {
    expect(progressLines(subscription({ status: 'EXPIRED' }), WORDS, plain)).toEqual([
      'Ended 2026-10-30',
    ]);
    expect(progressLines(subscription({ status: 'UPCOMING' }), WORDS, plain)).toEqual([
      'Starts 2026-10-01',
    ]);
    expect(progressLines(subscription({ startsOn: null, endsOn: null }), WORDS, plain)).toEqual([
      'No end date',
    ]);
  });
});
