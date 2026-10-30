import { addMonths, gazaClockOf } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { clockOf } from '@shared/lib';
import { isolate } from '@shared/localisation';
import { monthChange } from '../../services/monthChange';
import { monthLabel, monthTick } from '../../services/monthLabel';
import { useLoadFailure } from '../useLoadFailure';
import { useMoney } from '../useMoney';
import { useIncomeQuery } from './useIncomeQuery';

/** Every fifth day's tick, counted back from today, the last of the 30. */
const DAY_TICK_EVERY = 5;

/**
 * Finance › Income (D5.3), ready to render: what income counts; today, the month asked against the
 * month before, and all time; the last 12 months and the visits' last 30 days, both fixed windows
 * whatever the month; and each staff member's collections in the month. Every figure is the server's.
 */
export function useIncomeTab(spaceId: number, asked: string | undefined) {
  const copy = useCopy();
  const words = copy.finance.income;
  const { language, money } = useMoney();
  const result = useIncomeQuery(spaceId, asked);
  const failure = useLoadFailure(result.data === undefined ? result.error : null, () => {
    void result.refetch();
  });
  const report = result.data;

  if (report === undefined) {
    return result.isPending
      ? { state: 'loading' as const, failure }
      : { state: 'failed' as const, failure };
  }

  const shown = (agorot: number) => isolate(money(agorot));
  const label = monthLabel(report.month, language);
  const change = monthChange(report.income.totalAgorot, report.previousMonth.totalAgorot);
  const readAt = gazaClockOf(new Date(result.dataUpdatedAt)).minute;
  const series = [
    { name: words.series.subscriptions, tone: 1 as const },
    { name: words.series.visits, tone: 2 as const },
  ];
  const lastDay = report.visitsByDay.length - 1;

  return {
    state: 'ready' as const,
    failure,
    /** Another month is loading, the figures shown meanwhile those already there. */
    busy: result.isPlaceholderData,
    definition: words.definition,
    tiles: [
      {
        key: 'today',
        label: words.today,
        value: shown(report.today.totalAgorot),
        helper: words.upTo({ time: isolate(clockOf(readAt)) }),
      },
      {
        key: 'month',
        label,
        value: shown(report.income.totalAgorot),
        helper:
          change === null
            ? undefined
            : words.vsPrevious({
                change: isolate(change),
                month: monthLabel(addMonths(report.month, -1), language),
              }),
      },
      {
        key: 'allTime',
        label: words.allTime,
        value: shown(report.allTime.totalAgorot),
        helper:
          report.allTime.since === null
            ? words.noPayments
            : words.since({ month: monthLabel(report.allTime.since.slice(0, 7), language) }),
      },
    ],
    byMonth: {
      title: words.byMonth.title,
      description: words.byMonth.description,
      chart: {
        title: words.byMonth.chart,
        periodLabel: words.byMonth.period,
        series,
        data: report.months.map(({ month: bar, income }) => ({
          label: monthLabel(bar, language),
          tick: monthTick(bar, language),
          values: [income.subscriptionsAgorot, income.visitsAgorot],
        })),
        format: money,
      },
    },
    byDay: {
      title: words.byDay.title,
      description: words.byDay.description,
      chart: {
        title: words.byDay.chart,
        periodLabel: words.byDay.period,
        series: [{ name: words.series.visits, tone: 2 as const }],
        data: report.visitsByDay.map(({ date, agorot }, index) => ({
          label: date,
          // The day of the month under every fifth day counted back from today; none between.
          tick: (lastDay - index) % DAY_TICK_EVERY === 0 ? String(Number(date.slice(8))) : '',
          values: [agorot],
        })),
        format: money,
      },
    },
    collections: {
      title: words.collections.title,
      description: label,
      columns: words.collections.columns,
      rows: report.collections.map((entry) => ({
        key: String(entry.recordedBy.id),
        name: entry.recordedBy.name,
        count: String(entry.count),
        total: money(entry.totalAgorot),
        cash: money(entry.byMethod.CASH),
        transfer: money(entry.byMethod.TRANSFER),
      })),
      none: words.collections.none,
    },
    csv: words.csv,
    report,
  };
}

/** Finance › Income, ready to render. */
export type IncomeTabView = ReturnType<typeof useIncomeTab>;
