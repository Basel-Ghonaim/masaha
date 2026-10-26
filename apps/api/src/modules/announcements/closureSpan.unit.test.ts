import { describe, expect, it } from 'vitest';

import { closureSpan } from './closureSpan.ts';

// Gaza is UTC+2 from 2026-10-24: the instants below carry their offset.
const at = (instant: string) => new Date(instant);
const NOW = at('2026-11-10T10:00:00+02:00');

describe('closureSpan', () => {
  it("a closure's days from its start's Gaza day to its end's; an end at midnight covers the day before; a running one to today; a start at 23:30 UTC is the next Gaza day", () => {
    // Thursday 08:00 to Saturday 00:00: Thursday and Friday.
    expect(
      closureSpan(
        { startsAt: at('2026-11-05T08:00:00+02:00'), endsAt: at('2026-11-07T00:00:00+02:00') },
        NOW,
      ),
    ).toEqual({ firstDay: '2026-11-05', lastDay: '2026-11-06', days: 2 });
    // A minute past midnight covers Saturday too.
    expect(
      closureSpan(
        { startsAt: at('2026-11-05T08:00:00+02:00'), endsAt: at('2026-11-07T00:01:00+02:00') },
        NOW,
      ).lastDay,
    ).toBe('2026-11-07');
    // Running, with no end or with an end to come: to today.
    expect(closureSpan({ startsAt: at('2026-11-05T08:00:00+02:00'), endsAt: null }, NOW)).toEqual({
      firstDay: '2026-11-05',
      lastDay: '2026-11-10',
      days: 6,
    });
    expect(
      closureSpan(
        { startsAt: at('2026-11-05T08:00:00+02:00'), endsAt: at('2026-11-20T00:00:00+02:00') },
        NOW,
      ),
    ).toEqual({ firstDay: '2026-11-05', lastDay: '2026-11-10', days: 6 });
    // 23:30 UTC is 01:30 the next day in Gaza; one hour, one day.
    expect(
      closureSpan(
        { startsAt: at('2026-11-04T23:30:00Z'), endsAt: at('2026-11-05T00:30:00Z') },
        NOW,
      ),
    ).toEqual({ firstDay: '2026-11-05', lastDay: '2026-11-05', days: 1 });
  });
});
