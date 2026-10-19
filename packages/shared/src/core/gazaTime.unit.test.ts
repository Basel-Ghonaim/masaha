import { describe, expect, it } from 'vitest';

import { gazaClockOf, gazaInstant } from './gazaTime.ts';

// Gaza is UTC+2 in winter and UTC+3 in summer. The daylight-saving changes pinned here are read
// from Node's zone data (docs/backend/conventions.md §11): 2026-03-28 at 02:00 (+02:00 → +03:00)
// and 2026-10-24 at 02:00 (+03:00 → +02:00). Outdated zone data fails these tests.

describe('gazaClockOf', () => {
  it("reads a winter and a summer instant as Gaza's date, weekday and minute", () => {
    expect(gazaClockOf(new Date('2026-01-15T08:30:00Z'))).toEqual({
      date: '2026-01-15',
      dayOfWeek: 4,
      minute: 10 * 60 + 30,
    });
    expect(gazaClockOf(new Date('2026-07-01T07:30:00Z'))).toEqual({
      date: '2026-07-01',
      dayOfWeek: 3,
      minute: 10 * 60 + 30,
    });
    // Late in a UTC evening it is already the next day in Gaza.
    expect(gazaClockOf(new Date('2026-07-01T21:30:00Z'))).toEqual({
      date: '2026-07-02',
      dayOfWeek: 4,
      minute: 30,
    });
  });
});

describe('gazaInstant', () => {
  it('turns a Gaza date and minute into the instant, on both sides of a daylight-saving change', () => {
    expect(gazaInstant('2026-01-15', 10 * 60)).toEqual(new Date('2026-01-15T08:00:00Z'));
    expect(gazaInstant('2026-07-01', 10 * 60)).toEqual(new Date('2026-07-01T07:00:00Z'));

    // The spring change: midnight is still +02:00, ten o'clock already +03:00.
    expect(gazaInstant('2026-03-28', 0)).toEqual(new Date('2026-03-27T22:00:00Z'));
    expect(gazaInstant('2026-03-28', 10 * 60)).toEqual(new Date('2026-03-28T07:00:00Z'));
    // The autumn change: midnight is still +03:00, ten o'clock already +02:00.
    expect(gazaInstant('2026-10-24', 0)).toEqual(new Date('2026-10-23T21:00:00Z'));
    expect(gazaInstant('2026-10-24', 10 * 60)).toEqual(new Date('2026-10-24T08:00:00Z'));
  });

  it("reads minute 1440 as the next day's midnight", () => {
    expect(gazaInstant('2026-01-15', 1440)).toEqual(new Date('2026-01-15T22:00:00Z'));
    expect(gazaInstant('2026-10-24', 1440)).toEqual(new Date('2026-10-24T22:00:00Z'));
  });
});
