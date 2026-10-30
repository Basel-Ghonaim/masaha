import type { OccupancyReport } from '@masaha/shared/finance';
import type { Language } from '@shared/copy';
import { csvOf } from '@shared/lib';
import { weekdayName, weekdaysOf } from './weekdays';

/** The 24 hours' headers, «00» … «23». */
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

/**
 * The occupancy's CSV (D5.5): `masaha-occupancy-{today}.csv`, «اليوم» then «00» … «23», a row per
 * weekday in the language's week, by its name, with its 24 averages.
 */
export function occupancyCsv(
  report: OccupancyReport,
  { today, language, day }: { today: string; language: Language; day: string },
) {
  const byWeekday = new Map(report.byHour.map((row) => [row.weekday, row.hours]));
  return {
    name: `masaha-occupancy-${today}.csv`,
    text: csvOf(
      [day, ...HOURS],
      weekdaysOf(language).map((weekday) => [
        weekdayName(weekday, language),
        ...(byWeekday.get(weekday) ?? HOURS.map(() => 0)),
      ]),
    ),
  };
}
