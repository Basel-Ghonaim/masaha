import { useCopy } from '@shared/copy';
import { monthLabel } from '../../services/monthLabel';
import { stayText } from '../../services/stayText';
import { weekdayName, weekdaysOf } from '../../services/weekdays';
import { useLoadFailure } from '../useLoadFailure';
import { useMoney } from '../useMoney';
import { useOccupancyQuery } from './useOccupancyQuery';

/** A tick under every second day of the 14, counted back from today. */
const DAY_TICK_EVERY = 2;

const hourOf = (hour: number) => String(hour).padStart(2, '0');

/**
 * Finance › Occupancy (D5.5), ready to render: the month's average stay (all, members, visits), its
 * peak hour and its average daily attendance, «—» with no closed stay; the average present per
 * weekday and hour over the last 4 weeks, a weekday with no presence left out and the hours from the
 * first to the last with any (DI16); and visits and members per day over the last 14 days.
 */
export function useOccupancyTab(spaceId: number, asked: string | undefined) {
  const copy = useCopy();
  const words = copy.finance.occupancy;
  const { language } = useMoney();
  const result = useOccupancyQuery(spaceId, asked);
  const failure = useLoadFailure(result.data === undefined ? result.error : null, () => {
    void result.refetch();
  });
  const report = result.data;

  if (report === undefined) {
    return result.isPending
      ? { state: 'loading' as const, failure }
      : { state: 'failed' as const, failure };
  }

  const month = monthLabel(report.month, language);
  const minutes = (value: number | null) => (value === null ? words.none : stayText(value));
  const { averageStayMinutes: stay } = report;
  const noStays = words.noStays({ month });

  const byWeekday = new Map(report.byHour.map((row) => [row.weekday, row.hours]));
  const rows = weekdaysOf(language)
    .map((weekday) => ({ weekday, hours: byWeekday.get(weekday) ?? [] }))
    .filter(({ hours }) => hours.some((value) => value > 0));
  const busy = Array.from({ length: 24 }, (_, hour) => hour).filter((hour) =>
    rows.some(({ hours }) => (hours[hour] ?? 0) > 0),
  );
  const first = busy[0];
  const last = busy.at(-1);
  const hours =
    first === undefined || last === undefined
      ? []
      : Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const lastDay = report.byDay.length - 1;

  return {
    state: 'ready' as const,
    failure,
    busy: result.isPlaceholderData,
    tiles: [
      {
        key: 'stay',
        label: words.stay.label,
        value: stay.all === null ? words.none : words.stay.value({ time: stayText(stay.all) }),
        helper:
          stay.all === null
            ? noStays
            : words.stay.helper({
                members: minutes(stay.members),
                visits: minutes(stay.visits),
                month,
              }),
      },
      {
        key: 'peak',
        label: words.peak.label,
        value:
          report.peakHour === null
            ? words.none
            : `${hourOf(report.peakHour)}:00–${hourOf(report.peakHour + 1)}:00`,
        helper: report.peakHour === null ? noStays : month,
      },
      {
        key: 'attendance',
        label: words.attendance.label,
        value:
          report.averageDailyAttendance === null
            ? words.none
            : report.averageDailyAttendance.toFixed(1),
        helper: report.averageDailyAttendance === null ? noStays : month,
      },
    ],
    heatmap: {
      title: words.heatmap.title,
      description: words.heatmap.description,
      empty: rows.length === 0 ? words.heatmap.empty : null,
      chart: {
        title: words.heatmap.chart,
        unit: words.heatmap.unit,
        fewer: words.heatmap.fewer,
        more: words.heatmap.more,
        dayLabel: words.heatmap.day,
        columns: hours.map(hourOf),
        rows: rows.map(({ weekday, hours: values }) => ({
          label: weekdayName(weekday, language),
          values: hours.map((hour) => values[hour] ?? 0),
        })),
      },
    },
    byDay: {
      title: words.byDay.title,
      description: words.byDay.description,
      chart: {
        title: words.byDay.chart,
        periodLabel: words.byDay.period,
        series: [
          { name: words.byDay.members, tone: 1 as const },
          { name: words.byDay.visits, tone: 2 as const },
        ],
        data: report.byDay.map(({ date, members, visits }, index) => ({
          label: date,
          tick: (lastDay - index) % DAY_TICK_EVERY === 0 ? String(Number(date.slice(8))) : '',
          values: [members, visits],
        })),
        format: String,
      },
    },
    report,
  };
}

/** Finance › Occupancy, ready to render. */
export type OccupancyTabView = ReturnType<typeof useOccupancyTab>;
