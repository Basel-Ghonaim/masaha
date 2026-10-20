import type { Rates } from '@masaha/shared/visits';
import type { Price } from '@masaha/shared/spaces';

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
