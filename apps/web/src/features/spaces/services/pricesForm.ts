import type { Price, UpdateSpacePricesRequest } from '@masaha/shared/spaces';

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

const ARABIC_INDIC_ZERO = 0x0660;

/** An amount in agorot as shekels: `1500` → `15`, `1250` → `12.50`. */
export function shekelsOf(agorot: number): string {
  return agorot % 100 === 0 ? String(agorot / 100) : (agorot / 100).toFixed(2);
}

/**
 * The agorot an amount typed in shekels names: Western or Arabic-Indic digits, `.`, `,` or `٫` as
 * the separator. Up to two decimals, it is whole agorot; more, it is left unrounded, which the
 * contract refuses as no whole number. A blank is no value (`undefined`); a text it cannot read is
 * handed back as typed, so the contract's schema refuses it as `invalid_format`.
 */
export function agorotOf(text: string): number | string | undefined {
  const typed = text
    .trim()
    .replace(/[٠-٩]/g, (digit) =>
      String((digit.codePointAt(0) ?? ARABIC_INDIC_ZERO) - ARABIC_INDIC_ZERO),
    )
    .replace(/[,٫]/, '.');
  if (typed === '') return undefined;
  const parts = /^(\d*)(?:\.(\d*))?$/.exec(typed);
  if (parts === null || !/\d/.test(typed)) return text;
  const shekels = Number(typed);
  const decimals = parts[2]?.length ?? 0;
  return decimals <= 2 ? Math.round(shekels * 100) : shekels * 100;
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
