import { describe, expect, it } from 'vitest';

import { subscriptionStatus, type StatusTerms } from './subscriptionStatus.ts';

const TODAY = '2026-10-21';

/** A subscription with no dates, no totals and not ended, unless overridden. */
const terms = (overrides: Partial<StatusTerms> = {}): StatusTerms => ({
  startsOn: null,
  endsOn: null,
  totalDays: null,
  totalHours: null,
  ended: false,
  ...overrides,
});

const NOTHING_USED = { daysUsed: 0, minutesUsed: 0 };

describe('subscriptionStatus', () => {
  it('ended early → EXPIRED, even before its start', () => {
    expect(subscriptionStatus(terms({ ended: true }), NOTHING_USED, TODAY)).toBe('EXPIRED');
    expect(
      subscriptionStatus(
        terms({ ended: true, startsOn: '2026-10-25', endsOn: '2026-10-25' }),
        NOTHING_USED,
        TODAY,
      ),
    ).toBe('EXPIRED');
  });

  it('a start after today → UPCOMING', () => {
    const upcoming = terms({ startsOn: '2026-10-22', endsOn: '2026-11-20' });
    expect(subscriptionStatus(upcoming, NOTHING_USED, TODAY)).toBe('UPCOMING');
    expect(subscriptionStatus({ ...upcoming, startsOn: TODAY }, NOTHING_USED, TODAY)).toBe(
      'ACTIVE',
    );
  });

  it('an end before today → EXPIRED; its last day is still ending soon', () => {
    const month = terms({ startsOn: '2026-09-21', endsOn: '2026-10-20' });
    expect(subscriptionStatus(month, NOTHING_USED, TODAY)).toBe('EXPIRED');
    expect(subscriptionStatus({ ...month, endsOn: TODAY }, NOTHING_USED, TODAY)).toBe(
      'ENDING_SOON',
    );
  });

  it('total days used up → EXPIRED', () => {
    const six = terms({ totalDays: 6 });
    expect(subscriptionStatus(six, { daysUsed: 6, minutesUsed: 0 }, TODAY)).toBe('EXPIRED');
    expect(subscriptionStatus(six, { daysUsed: 5, minutesUsed: 0 }, TODAY)).toBe('ENDING_SOON');
  });

  it('total hours used up → EXPIRED', () => {
    const pack = terms({ totalHours: 20 });
    expect(subscriptionStatus(pack, { daysUsed: 9, minutesUsed: 1_200 }, TODAY)).toBe('EXPIRED');
    expect(subscriptionStatus(pack, { daysUsed: 9, minutesUsed: 1_199 }, TODAY)).toBe(
      'ENDING_SOON',
    );
  });

  it('seven days to its end → ENDING_SOON; eight → ACTIVE', () => {
    const month = terms({ startsOn: '2026-10-01', endsOn: '2026-10-28' });
    expect(subscriptionStatus(month, NOTHING_USED, TODAY)).toBe('ENDING_SOON');
    expect(subscriptionStatus({ ...month, endsOn: '2026-10-29' }, NOTHING_USED, TODAY)).toBe(
      'ACTIVE',
    );
  });

  it('a subscription of at most seven days by its dates is ending soon on its last day only', () => {
    const week = terms({ startsOn: '2026-10-21', endsOn: '2026-10-27' });
    expect(subscriptionStatus(week, NOTHING_USED, TODAY)).toBe('ACTIVE');
    expect(subscriptionStatus(week, NOTHING_USED, '2026-10-26')).toBe('ACTIVE');
    expect(subscriptionStatus(week, NOTHING_USED, '2026-10-27')).toBe('ENDING_SOON');
    // Eight days by its dates: the usual seven days before its end.
    expect(subscriptionStatus({ ...week, endsOn: '2026-10-28' }, NOTHING_USED, TODAY)).toBe(
      'ENDING_SOON',
    );
  });

  it('20 % of its total days left → ENDING_SOON; more → ACTIVE', () => {
    const ten = terms({ totalDays: 10 });
    expect(subscriptionStatus(ten, { daysUsed: 8, minutesUsed: 0 }, TODAY)).toBe('ENDING_SOON');
    expect(subscriptionStatus(ten, { daysUsed: 7, minutesUsed: 0 }, TODAY)).toBe('ACTIVE');
  });

  it('4 of 20 hours left (scenario 4) → ENDING_SOON; 5 → ACTIVE', () => {
    const pack = terms({ totalHours: 20 });
    expect(subscriptionStatus(pack, { daysUsed: 6, minutesUsed: 16 * 60 }, TODAY)).toBe(
      'ENDING_SOON',
    );
    expect(subscriptionStatus(pack, { daysUsed: 6, minutesUsed: 15 * 60 }, TODAY)).toBe('ACTIVE');
  });

  it('no end and no total → ACTIVE, however much is used', () => {
    expect(subscriptionStatus(terms(), { daysUsed: 400, minutesUsed: 90_000 }, TODAY)).toBe(
      'ACTIVE',
    );
  });
});
