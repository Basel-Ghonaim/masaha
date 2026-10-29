import type { HourSlot } from './windows.ts';

// The occupancy statistics' arithmetic (docs/architecture/data-model.md › Occupancy statistics):
// pure, over the hour slots and the stays the database counted in each. Averages are one decimal,
// half up; each numerator is a whole number, so the rounding is exact.

/** `numerator / denominator` to one decimal, half up. */
const oneDecimal = (numerator: number, denominator: number) =>
  Math.round((numerator * 10) / denominator) / 10;

/**
 * The average present per Gaza weekday (0 = Sunday … 6) and hour: the stays counted in every slot
 * of that weekday and hour, summed, over `weeks` weeks. Every weekday answers its 24 hours.
 */
export function averagePerHour(
  slots: readonly HourSlot[],
  counts: readonly number[],
  weeks = 4,
): { weekday: number; hours: number[] }[] {
  const sums = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  slots.forEach(({ weekday, hour }, i) => {
    const row = sums[weekday];
    if (row) row[hour] = (row[hour] ?? 0) + (counts[i] ?? 0);
  });
  return sums.map((hours, weekday) => ({
    weekday,
    hours: hours.map((sum) => oneDecimal(sum, weeks)),
  }));
}

/** The hour of the day with the most presence over the slots, ties the earliest; `null` with none. */
export function peakHour(slots: readonly HourSlot[], counts: readonly number[]): number | null {
  const byHour = Array.from({ length: 24 }, () => 0);
  slots.forEach(({ hour }, i) => {
    byHour[hour] = (byHour[hour] ?? 0) + (counts[i] ?? 0);
  });
  const most = Math.max(...byHour);
  return most > 0 ? byHour.indexOf(most) : null;
}

/** The mean of visits and members per day over the days with any, one decimal; `null` with none. */
export function averageDailyAttendance(
  days: readonly { visits: number; members: number }[],
): number | null {
  const attended = days.map(({ visits, members }) => visits + members).filter((day) => day > 0);
  if (attended.length === 0) return null;
  return oneDecimal(
    attended.reduce((sum, day) => sum + day, 0),
    attended.length,
  );
}
