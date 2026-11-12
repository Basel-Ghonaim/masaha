import { PRICE_PERIODS, type Price, type UpdateSpacePricesRequest } from '@masaha/shared/spaces';
import { agorotOf, shekelsOf } from '@shared/lib';

/**
 * The prices as their form holds them: a shift as its id's text, `''` for none; each label as saved
 * (a custom label is kept, never edited, R6) and the amount, in shekels, as typed.
 */
export type PricesValues = {
  prices: {
    period: Price['period'];
    audience: Price['audience'];
    shiftId: string;
    labelAr: string;
    labelEn: string;
    amountAgorot: string;
  }[];
};

/** One price as its form holds it. */
type PriceRow = PricesValues['prices'][number];

/**
 * The next price «إضافة سعر» adds (R7): the first period not yet priced for everyone, with no shift
 * and no label; once each is, the first for the students; once those are too, a day for everyone,
 * which the Sheet then says repeats. Its amount is still to type.
 */
export function nextPrice(rows: readonly PriceRow[]): PriceRow {
  const free = (audience: Price['audience']) =>
    PRICE_PERIODS.find(
      (period) =>
        !rows.some(
          (row) =>
            row.audience === audience &&
            row.period === period &&
            row.shiftId === '' &&
            row.labelAr.trim() === '',
        ),
    );
  const general = free('GENERAL');
  const student = general === undefined ? free('STUDENT') : undefined;
  return {
    period: general ?? student ?? 'DAY',
    audience: general === undefined && student !== undefined ? 'STUDENT' : 'GENERAL',
    shiftId: '',
    labelAr: '',
    labelEn: '',
    amountAgorot: '',
  };
}

/** A space's prices as their form holds them. */
export function pricesValues(prices: readonly Price[]): PricesValues {
  return {
    prices: prices.map((price) => ({
      period: price.period,
      audience: price.audience,
      shiftId: price.shiftId === null ? '' : String(price.shiftId),
      labelAr: price.labelAr ?? '',
      labelEn: price.labelEn ?? '',
      amountAgorot: shekelsOf(price.amountAgorot),
    })),
  };
}

/** A label left blank is none. */
const labelOf = (text: string) => (text.trim() === '' ? null : text);

/** The prices the contract's schema reads: no shift and a blank label as none, the amount in agorot. */
export function pricesInput(values: PricesValues): Record<string, unknown> {
  return {
    prices: values.prices.map((price) => ({
      period: price.period,
      audience: price.audience,
      shiftId: price.shiftId === '' ? null : Number(price.shiftId),
      labelAr: labelOf(price.labelAr),
      labelEn: labelOf(price.labelEn),
      amountAgorot: agorotOf(price.amountAgorot),
    })),
  };
}

/** Whether prices to save are `prices` as they are: the same rows in the same order, field by field. */
export function samePrices(request: UpdateSpacePricesRequest, prices: readonly Price[]): boolean {
  const rows = (list: UpdateSpacePricesRequest['prices']) =>
    list.map((price) => [
      price.period,
      price.audience,
      price.shiftId ?? null,
      price.labelAr ?? null,
      price.labelEn ?? null,
      price.amountAgorot,
    ]);
  return JSON.stringify(rows(request.prices)) === JSON.stringify(rows([...prices]));
}
