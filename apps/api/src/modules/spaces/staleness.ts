import { FACT_GROUPS, type FactGroup } from '@masaha/shared/spaces';

import type { StalenessThresholds } from '../platform-settings/index.ts';

// "Stale" and "missing" (docs/architecture/data-model.md › Derived values): a fact group never
// saved has no date and is missing; a dated group is stale once its date is older than its
// threshold, the price threshold for the prices and the general one for the others. One rule serves
// both the rows' stale and missing groups and the list's "stale only" filter: the filter compares
// each group's date with the same cut-off, and keeps a missing one.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Each group's date, when it was last saved or confirmed; null while it has never been saved. */
export type GroupDates = Record<FactGroup, Date | null>;

/** For each group, the date before which it is stale. */
export type GroupCutoffs = Record<FactGroup, Date>;

/** A space's freshness columns, one per group; only the profile is dated from the start. */
export interface FreshnessColumns {
  profileUpdatedAt: Date;
  hoursUpdatedAt: Date | null;
  pricesUpdatedAt: Date | null;
  amenitiesUpdatedAt: Date | null;
  contactsUpdatedAt: Date | null;
}

/** Each group's date, from the space's columns. */
export function groupDatesOf(space: FreshnessColumns): GroupDates {
  return {
    profile: space.profileUpdatedAt,
    hours: space.hoursUpdatedAt,
    prices: space.pricesUpdatedAt,
    amenities: space.amenitiesUpdatedAt,
    contacts: space.contactsUpdatedAt,
  };
}

/** For each group, the date before which it is stale. */
export function staleCutoffs(thresholds: StalenessThresholds, now: Date): GroupCutoffs {
  const before = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const general = before(thresholds.stalenessDays);
  const prices = before(thresholds.priceStalenessDays);
  return Object.fromEntries(
    FACT_GROUPS.map((group) => [group, group === 'prices' ? prices : general]),
  ) as GroupCutoffs;
}

/**
 * The stale groups, in the order of `FACT_GROUPS`; a group dated exactly at its cut-off is not, and
 * a missing group never is.
 */
export function staleGroups(dates: GroupDates, cutoffs: GroupCutoffs): FactGroup[] {
  return FACT_GROUPS.filter((group) => {
    const date = dates[group];
    return date !== null && date < cutoffs[group];
  });
}

/** The groups never saved, in the order of `FACT_GROUPS`. */
export function missingGroups(dates: GroupDates): FactGroup[] {
  return FACT_GROUPS.filter((group) => dates[group] === null);
}

/**
 * The latest of the groups' dates: when the space's facts last changed or were confirmed. The
 * profile is always dated, so there is one.
 */
export function lastUpdate(dates: GroupDates): Date {
  const times = FACT_GROUPS.flatMap((group) => dates[group]?.getTime() ?? []);
  return new Date(Math.max(...times));
}
