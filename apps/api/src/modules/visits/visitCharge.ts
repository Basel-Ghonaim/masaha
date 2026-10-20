import type { Price } from '@masaha/shared/spaces';
import type { Rates, VisitRounding } from '@masaha/shared/visits';

// The visit's money rules (docs/architecture/data-model.md › Visit charge): pure, so the check-in,
// the check-out and the reads decide them alike.

type Period = 'HOUR' | 'DAY';

/** Whom a visit is priced for: its audience and its shift, if any. */
export interface RatedVisit {
  audience: Price['audience'];
  shiftId: number | null;
}

/**
 * The price of one period for the visit, among the standard prices (no label) of one shift, or of
 * none: the audience's own, else the general one.
 */
function priceIn(
  prices: readonly Price[],
  period: Period,
  shiftId: number | null,
  { audience }: RatedVisit,
): number | null {
  const standard = prices.filter(
    (price) => price.period === period && price.shiftId === shiftId && price.labelAr === null,
  );
  const of = (wanted: Price['audience']) =>
    standard.find((price) => price.audience === wanted)?.amountAgorot;
  return of(audience) ?? of('GENERAL') ?? null;
}

/**
 * The rates a visit copies at its check-in, each period apart: its shift's price, else (a shift
 * without one) the price with no shift; in each, the audience's price, else the general one.
 */
export function ratesFor(prices: readonly Price[], visit: RatedVisit): Rates {
  const rateOf = (period: Period) =>
    (visit.shiftId === null ? null : priceIn(prices, period, visit.shiftId, visit)) ??
    priceIn(prices, period, null, visit);
  return { hourAgorot: rateOf('HOUR'), dayAgorot: rateOf('DAY') };
}

/** The rounding and the cap in force at a check-out (the space's settings then). */
export interface ChargeRule {
  rounding: VisitRounding;
  /** The N of "up after N minutes"; `null` for the other rules. */
  roundingMinutes: number | null;
  capAtDayPrice: boolean;
}

/** A visit's charge, as the check-out stores it, with the minutes it billed. */
export interface Charge {
  amountAgorot: number;
  billedMinutes: number;
  /** `null` when the charge is the day price alone, with no hour rate. */
  roundingRule: VisitRounding | null;
  roundingMinutes: number | null;
  /** Whether the day-price cap cut it; `null` with no hour rate. */
  capApplied: boolean | null;
}

const MINUTE_MS = 60_000;

/** The minutes a stay is billed for: its whole minutes, at least one. */
export function billedMinutesOf({ from, to }: { from: Date; to: Date }): number {
  return Math.max(1, Math.floor((to.getTime() - from.getTime()) / MINUTE_MS));
}

/** The hours' charge, by the rounding rule, before the cap; every fraction of an agora half up. */
function byRounding(minutes: number, hourAgorot: number, rule: ChargeRule): number {
  switch (rule.rounding) {
    case 'UP_AFTER_MINUTES': {
      // A started hour counts once more than N of its minutes have passed; at least one hour.
      const extra = minutes % 60 > (rule.roundingMinutes ?? 0) ? 1 : 0;
      return Math.max(1, Math.floor(minutes / 60) + extra) * hourAgorot;
    }
    case 'NEAREST_HALF_HOUR':
      // A quarter hour rounds up to the half; at least one half hour.
      return Math.round((Math.max(1, Math.round(minutes / 30)) * hourAgorot) / 2);
    case 'PER_MINUTE':
      return Math.round((minutes * hourAgorot) / 60);
  }
}

/**
 * A visit's charge for its stay (data model › Visit charge): the stay's whole minutes, at least
 * one, rounded by the rule and multiplied by the hour rate, capped at the day price when the cap is
 * on and there is one; with no hour rate, the day price; with neither, none.
 */
export function chargeOf(
  stay: { from: Date; to: Date },
  rates: Rates,
  rule: ChargeRule,
): Charge | null {
  const billedMinutes = billedMinutesOf(stay);
  const { hourAgorot, dayAgorot } = rates;
  if (hourAgorot === null) {
    return dayAgorot === null
      ? null
      : {
          amountAgorot: dayAgorot,
          billedMinutes,
          roundingRule: null,
          roundingMinutes: null,
          capApplied: null,
        };
  }
  const hours = byRounding(billedMinutes, hourAgorot, rule);
  const capApplied = rule.capAtDayPrice && dayAgorot !== null && hours > dayAgorot;
  return {
    amountAgorot: capApplied ? dayAgorot : hours,
    billedMinutes,
    roundingRule: rule.rounding,
    roundingMinutes: rule.rounding === 'UP_AFTER_MINUTES' ? rule.roundingMinutes : null,
    capApplied,
  };
}
