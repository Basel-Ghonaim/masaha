import { describe, expect, it } from 'vitest';

import { periodErrors } from './period.ts';

const NOW = new Date('2026-10-24T10:00:00+03:00');
const DAY = 86_400_000;
const days = (n: number, from = NOW) => new Date(from.getTime() + n * DAY);

describe('periodErrors', () => {
  it('a start 30 days back and 365 ahead at most', () => {
    expect(periodErrors({ startsAt: days(-30), endsAt: null }, NOW, 'create')).toBeNull();
    expect(periodErrors({ startsAt: days(365), endsAt: null }, NOW, 'create')).toBeNull();
    expect(periodErrors({ startsAt: days(-30.01), endsAt: null }, NOW, 'create')).toEqual({
      startsAt: ['out_of_range'],
    });
    expect(periodErrors({ startsAt: days(365.01), endsAt: null }, NOW, 'create')).toEqual({
      startsAt: ['out_of_range'],
    });
  });

  it('an end after now when set', () => {
    expect(periodErrors({ startsAt: days(-2), endsAt: days(0.01) }, NOW, 'create')).toBeNull();
    expect(periodErrors({ startsAt: days(-2), endsAt: NOW }, NOW, 'create')).toEqual({
      endsAt: ['out_of_range'],
    });
    expect(periodErrors({ startsAt: days(-2), endsAt: days(-1) }, NOW, 'create')).toEqual({
      endsAt: ['out_of_range'],
    });
  });

  it('at most 365 days after the start', () => {
    const startsAt = days(10);
    expect(periodErrors({ startsAt, endsAt: days(365, startsAt) }, NOW, 'create')).toBeNull();
    expect(periodErrors({ startsAt, endsAt: days(365.01, startsAt) }, NOW, 'create')).toEqual({
      endsAt: ['out_of_range'],
    });
  });

  it('an unchanged end on an edit is not checked against now; a changed one is, and the merged end follows the start', () => {
    // Ended an hour ago, its text edited: the end stays as it is.
    const ended = { startsAt: days(-2), endsAt: days(-1 / 24) };
    expect(periodErrors(ended, NOW, 'edit', { startsAt: false, endsAt: false })).toBeNull();
    expect(periodErrors(ended, NOW, 'edit', { startsAt: false, endsAt: true })).toEqual({
      endsAt: ['out_of_range'],
    });
    // An old start kept, though more than 30 days back; a changed one is held to the window.
    const old = { startsAt: days(-40), endsAt: null };
    expect(periodErrors(old, NOW, 'edit', { startsAt: false, endsAt: false })).toBeNull();
    expect(periodErrors(old, NOW, 'edit', { startsAt: true, endsAt: false })).toEqual({
      startsAt: ['out_of_range'],
    });
    // A start moved past the kept end.
    expect(
      periodErrors({ startsAt: days(3), endsAt: days(2) }, NOW, 'edit', {
        startsAt: true,
        endsAt: false,
      }),
    ).toEqual({ endsAt: ['out_of_range'] });
  });
});
