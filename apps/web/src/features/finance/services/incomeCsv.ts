import type { IncomeReport } from '@masaha/shared/finance';
import { csvOf } from '@shared/lib';
import { shekelsText } from './shekels';

/** The income CSV's header, in the interface's language. */
type IncomeCsvWords = { month: string; subscriptions: string; visits: string; total: string };

/**
 * The income's CSV (D5.3): `masaha-income-{month}.csv`, a row per month of the last 12 — the month
 * as `YYYY-MM`, then its subscriptions, visits and total in shekels with a dot.
 */
export function incomeCsv(report: IncomeReport, words: IncomeCsvWords) {
  return {
    name: `masaha-income-${report.month}.csv`,
    text: csvOf(
      [words.month, words.subscriptions, words.visits, words.total],
      report.months.map(({ month, income }) => [
        month,
        shekelsText(income.subscriptionsAgorot),
        shekelsText(income.visitsAgorot),
        shekelsText(income.totalAgorot),
      ]),
    ),
  };
}
