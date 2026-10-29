import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  daysFrom,
  gazaClockOf,
  gazaInstant,
  monthOf,
  weekStartOf,
} from './gazaTime.ts';

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

describe('addDays', () => {
  it('crosses a month, a year and a leap day, forwards and back', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2026-10-21', 0)).toBe('2026-10-21');
    expect(addDays('2026-10-21', 29)).toBe('2026-11-19');
  });
});

describe('daysFrom', () => {
  it('counts calendar days across a month, a year and a leap day', () => {
    expect(daysFrom('2026-10-21', '2026-10-21')).toBe(0);
    expect(daysFrom('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysFrom('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysFrom('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysFrom('2026-10-21', '2026-11-19')).toBe(29);
    expect(daysFrom('2026-11-19', '2026-10-21')).toBe(-29);
    // Across Gaza's daylight-saving change, still whole days.
    expect(daysFrom('2026-10-23', '2026-10-25')).toBe(2);
  });
});

describe('weekStartOf', () => {
  it('answers the Saturday on or before the date, a Saturday itself', () => {
    expect(weekStartOf('2026-10-17')).toBe('2026-10-17'); // Saturday
    expect(weekStartOf('2026-10-18')).toBe('2026-10-17'); // Sunday
    expect(weekStartOf('2026-10-23')).toBe('2026-10-17'); // Friday
    expect(weekStartOf('2027-01-01')).toBe('2026-12-26'); // a Friday, across the year
  });
});

describe('monthOf and addMonths', () => {
  it('monthOf and addMonths across a year, back and ahead', () => {
    expect(monthOf('2026-10-29')).toBe('2026-10');
    expect(monthOf('2027-01-01')).toBe('2027-01');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
    expect(addMonths('2026-10', 1)).toBe('2026-11');
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-10', 3)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2026-10', -23)).toBe('2024-11');
    expect(addMonths('2026-10', -10)).toBe('2025-12');
    expect(addMonths('2026-10', 12)).toBe('2027-10');
  });
});
