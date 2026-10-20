import { describe, expect, it } from 'vitest';

import { liveStatus, type LiveStatusInput } from './liveStatus.ts';

const NOW = new Date('2026-10-18T07:00:00Z');
const IN_AN_HOUR = new Date('2026-10-18T08:00:00Z');
const AN_HOUR_AGO = new Date('2026-10-18T06:00:00Z');

/** Open 08:00–18:00 every day but Friday (5), which is closed. */
const WEEK = [0, 1, 2, 3, 4, 5, 6].map((day) =>
  day === 5 ? null : { opensMinute: 8 * 60, closesMinute: 18 * 60 },
);

/** A verified space, open now (Sunday 10:00), with 3 present of 10 and nothing else in force. */
const OPEN: LiveStatusInput = {
  verified: true,
  closureNow: false,
  week: WEEK,
  at: { date: '2026-10-18', dayOfWeek: 0, minute: 10 * 60 },
  now: NOW,
  override: null,
  capacity: 10,
  present: 3,
};

const at = (dayOfWeek: number, minute: number) => ({ date: '2026-10-18', dayOfWeek, minute });

describe('liveStatus', () => {
  it('an open space with room is AVAILABLE', () => {
    expect(liveStatus(OPEN)).toBe('AVAILABLE');
  });

  it('an unverified space has no live state, even under a closure or an override', () => {
    expect(liveStatus({ ...OPEN, verified: false })).toBeNull();
    expect(liveStatus({ ...OPEN, verified: false, closureNow: true })).toBeNull();
    expect(
      liveStatus({ ...OPEN, verified: false, override: { state: 'FULL', until: IN_AN_HOUR } }),
    ).toBeNull();
  });

  it('an active closure makes it CLOSED, over an override and within its hours', () => {
    expect(liveStatus({ ...OPEN, closureNow: true })).toBe('CLOSED');
    expect(
      liveStatus({
        ...OPEN,
        closureNow: true,
        override: { state: 'AVAILABLE', until: IN_AN_HOUR },
      }),
    ).toBe('CLOSED');
    // Over a space without hours or capacity too: the closure comes first.
    expect(liveStatus({ ...OPEN, closureNow: true, week: null, capacity: null })).toBe('CLOSED');
  });

  it("outside today's hours it is CLOSED: before opening, at the closing minute, on a closed day", () => {
    expect(liveStatus({ ...OPEN, at: at(0, 8 * 60 - 1) })).toBe('CLOSED');
    expect(liveStatus({ ...OPEN, at: at(0, 8 * 60) })).toBe('AVAILABLE');
    expect(liveStatus({ ...OPEN, at: at(0, 18 * 60 - 1) })).toBe('AVAILABLE');
    expect(liveStatus({ ...OPEN, at: at(0, 18 * 60) })).toBe('CLOSED');
    expect(liveStatus({ ...OPEN, at: at(5, 10 * 60) })).toBe('CLOSED');
    // An override does not open a closed space.
    expect(
      liveStatus({
        ...OPEN,
        at: at(5, 10 * 60),
        override: { state: 'AVAILABLE', until: IN_AN_HOUR },
      }),
    ).toBe('CLOSED');
  });

  it('an override in force gives its state while open, even without a capacity', () => {
    expect(liveStatus({ ...OPEN, override: { state: 'FULL', until: IN_AN_HOUR } })).toBe('FULL');
    expect(liveStatus({ ...OPEN, override: { state: 'CLOSED', until: IN_AN_HOUR } })).toBe(
      'CLOSED',
    );
    expect(
      liveStatus({
        ...OPEN,
        present: 10,
        override: { state: 'AVAILABLE', until: IN_AN_HOUR },
      }),
    ).toBe('AVAILABLE');
    expect(
      liveStatus({ ...OPEN, capacity: null, override: { state: 'FULL', until: IN_AN_HOUR } }),
    ).toBe('FULL');
  });

  it('an override whose end has passed counts for nothing', () => {
    expect(liveStatus({ ...OPEN, override: { state: 'FULL', until: AN_HOUR_AGO } })).toBe(
      'AVAILABLE',
    );
    expect(liveStatus({ ...OPEN, override: { state: 'FULL', until: NOW } })).toBe('AVAILABLE');
  });

  it('without any hours there is no live state, an override included', () => {
    expect(liveStatus({ ...OPEN, week: null })).toBeNull();
    expect(
      liveStatus({ ...OPEN, week: null, override: { state: 'FULL', until: IN_AN_HOUR } }),
    ).toBeNull();
  });

  it('open without a capacity has no live state', () => {
    expect(liveStatus({ ...OPEN, capacity: null })).toBeNull();
  });

  it('present equal to capacity is FULL; one below is AVAILABLE', () => {
    expect(liveStatus({ ...OPEN, present: 10 })).toBe('FULL');
    expect(liveStatus({ ...OPEN, present: 11 })).toBe('FULL');
    expect(liveStatus({ ...OPEN, present: 9 })).toBe('AVAILABLE');
  });

  it('a day open 0–1440 is open at 23:59', () => {
    const aroundTheClock = WEEK.map(() => ({ opensMinute: 0, closesMinute: 1440 }));
    expect(liveStatus({ ...OPEN, week: aroundTheClock, at: at(0, 1439) })).toBe('AVAILABLE');
    expect(liveStatus({ ...OPEN, week: aroundTheClock, at: at(0, 0) })).toBe('AVAILABLE');
  });
});
