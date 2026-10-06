import { FACT_GROUPS, type FactGroup } from '@masaha/shared/spaces';

import type { StalenessThresholds } from '../platform-settings/index.ts';

// "Stale" (docs/architecture/data-model.md › Derived values): a fact group whose date is older than
// its threshold, the price threshold for the prices and the general one for the others. One rule
// serves both the rows' stale groups and the list's "stale only" filter: the filter compares each
// group's date with the same cut-off.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Each group's date, when it was last saved or confirmed. */
export type GroupDates = Record<FactGroup, Date>;

/** For each group, the date before which it is stale. */
export function staleCutoffs(thresholds: StalenessThresholds, now: Date): GroupDates {
  const before = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const general = before(thresholds.stalenessDays);
  const prices = before(thresholds.priceStalenessDays);
  return Object.fromEntries(
    FACT_GROUPS.map((group) => [group, group === 'prices' ? prices : general]),
  ) as GroupDates;
}

/** The stale groups, in the order of `FACT_GROUPS`; a group dated exactly at its cut-off is not. */
export function staleGroups(dates: GroupDates, cutoffs: GroupDates): FactGroup[] {
  return FACT_GROUPS.filter((group) => dates[group] < cutoffs[group]);
}

/** The latest of the groups' dates: when the space's facts last changed or were confirmed. */
export function lastUpdate(dates: GroupDates): Date {
  return new Date(Math.max(...FACT_GROUPS.map((group) => dates[group].getTime())));
}
