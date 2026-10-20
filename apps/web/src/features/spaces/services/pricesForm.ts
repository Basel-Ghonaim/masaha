import type { Price, UpdateSpacePricesRequest } from '@masaha/shared/spaces';
import { agorotOf, shekelsOf } from '@shared/lib';

/**
 * The prices as their form holds them: a shift as its id's text, `''` for none; each label and the
 * amount, in shekels, as typed.
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

/** A new price: a day, for everyone, no shift, no label, its amount still to type. */
export const NEW_PRICE: PricesValues['prices'][number] = {
  period: 'DAY',
  audience: 'GENERAL',
  shiftId: '',
  labelAr: '',
  labelEn: '',
  amountAgorot: '',
};

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
