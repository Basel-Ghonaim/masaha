import { PRICE_PERIODS, type AdminSpace, type Price } from '@masaha/shared/spaces';
import type { Catalogue } from '@shared/copy';
import { isolated } from '@shared/forms';
import { priceText } from '@shared/lib';

/**
 * The prices as the profile's table shows them (R9): those with no shift first, then each shift's,
 * by period, everyone's before the students', the saved order breaking a tie; and the columns it
 * needs — «لمن» only when a student price exists, «الوردية» only when a price names a shift.
 */
export function pricesView(prices: readonly Price[]): {
  rows: Price[];
  students: boolean;
  shifts: boolean;
} {
  const shiftRank = (price: Price) => (price.shiftId === null ? -1 : price.shiftId);
  const rows = prices
    .map((price, index) => ({ price, index }))
    .sort(
      (first, second) =>
        shiftRank(first.price) - shiftRank(second.price) ||
        PRICE_PERIODS.indexOf(first.price.period) - PRICE_PERIODS.indexOf(second.price.period) ||
        (first.price.audience === 'GENERAL' ? 0 : 1) -
          (second.price.audience === 'GENERAL' ? 0 : 1) ||
        first.index - second.index,
    )
    .map(({ price }) => price);
  return {
    rows,
    students: prices.some((price) => price.audience === 'STUDENT'),
    shifts: prices.some((price) => price.shiftId !== null),
  };
}

/**
 * The prices' table, ready to render, as the profile and Packages & prices both show it: its caption,
 * its columns, and each row — a custom label in the period's place, the audience, the shift by its
 * name in the interface's language, the amount in shekels, left to right.
 */
export function pricesTable(
  space: Pick<AdminSpace, 'prices' | 'hours'>,
  words: Catalogue['spaces']['editor']['prices'],
  english: boolean,
) {
  const table = pricesView(space.prices);
  const shifts = space.hours?.shifts ?? [];
  return {
    caption: words.caption,
    columns: {
      period: words.period,
      audience: table.students ? words.audience : null,
      shift: table.shifts ? words.shift : null,
      price: words.price,
    },
    rows: table.rows.map((price, index) => {
      const shift = shifts.find((one) => one.id === price.shiftId);
      return {
        key: `${String(index)}:${price.period}:${price.audience}:${String(price.shiftId)}`,
        period:
          price.labelAr === null
            ? words.periodsView[price.period]
            : english
              ? (price.labelEn ?? price.labelAr)
              : price.labelAr,
        audience: words.audiencesView[price.audience],
        student: price.audience === 'STUDENT',
        shift: shift === undefined ? null : english ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
        amount: isolated(priceText(price.amountAgorot, english ? 'en' : 'ar')),
      };
    }),
  };
}

export type PricesTableView = ReturnType<typeof pricesTable>;
