import { describe, expect, it } from 'vitest';

import { averageDailyAttendance, averagePerHour, peakHour } from './occupancyGrid.ts';

// The occupancy statistics' arithmetic (data model › Occupancy statistics): pure, over the hour
// slots and the counts the database answers for them.

/** A slot of this weekday and hour; its instants do not matter here. */
const slot = (weekday: number, hour: number) => ({
  from: new Date(0),
  to: new Date(0),
  weekday,
  hour,
});

describe('the occupancy grid', () => {
  it('the average per weekday and hour over 4 weeks, one decimal', () => {
    // Sunday at 9: 1, 2, 0 and 2 present over four Sundays → 1.25 → 1.3 (half up).
    // Monday at 14: 3 on one Monday → 0.75 → 0.8. Saturday at 23: 1 → 0.25 → 0.3.
    const slots = [
      slot(0, 9),
      slot(0, 9),
      slot(0, 9),
      slot(0, 9),
      slot(1, 14),
      slot(6, 23),
      slot(3, 10),
    ];
    const counts = [1, 2, 0, 2, 3, 1, 0];

    const grid = averagePerHour(slots, counts);

    expect(grid.map(({ weekday }) => weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(grid.every(({ hours }) => hours.length === 24)).toBe(true);
    expect(grid[0]?.hours[9]).toBe(1.3);
    expect(grid[1]?.hours[14]).toBe(0.8);
    expect(grid[6]?.hours[23]).toBe(0.3);
    expect(grid[3]?.hours[10]).toBe(0);
    expect(grid[2]?.hours.every((value) => value === 0)).toBe(true);
  });

  it('the peak hour, ties the earliest, none without stays', () => {
    // 10:00 holds 2 + 3 over two days, 15:00 holds 5 on one: a tie, the earlier.
    expect(peakHour([slot(0, 10), slot(1, 10), slot(0, 15), slot(1, 8)], [2, 3, 5, 4])).toBe(10);
    expect(peakHour([slot(0, 10), slot(1, 15)], [1, 6])).toBe(15);
    expect(peakHour([slot(0, 10), slot(1, 15)], [0, 0])).toBeNull();
    expect(peakHour([], [])).toBeNull();
  });

  it('the daily attendance over the days with any', () => {
    // 3 + 2, nothing, 4 + 0, 1 + 1: 11 over 3 days → 3.666… → 3.7.
    expect(
      averageDailyAttendance([
        { visits: 3, members: 2 },
        { visits: 0, members: 0 },
        { visits: 4, members: 0 },
        { visits: 1, members: 1 },
      ]),
    ).toBe(3.7);
    expect(averageDailyAttendance([{ visits: 0, members: 0 }])).toBeNull();
    expect(averageDailyAttendance([])).toBeNull();
  });
});
