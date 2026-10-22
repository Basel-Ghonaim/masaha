import type { Price, Shift } from '@masaha/shared/spaces';
import type { Catalogue, Language } from '@shared/copy';
import { isolated } from '@shared/forms';
import { clockOf, priceText } from '@shared/lib';
import type { PriceGroupView } from '../types/PriceGroupView';
import { localText } from './localText';

type Words = Pick<Catalogue['directory']['page'], 'prices'>;

/** The prices of one tab: the whole day, or one shift. */
export type PriceTab = {
  key: string;
  label: string;
  /** The shift's hours, left to right; none for the whole day. */
  range: string | null;
  audiences: PriceGroupView[];
};

/**
 * How a cell of the prices' grid spans, so an incomplete last row shares its width (design issue
 * 31): two columns on a phone, where an odd count's last cell takes the row; four from 768 px, where
 * the last cells take what the count leaves (an odd count's last cell always spans there too).
 * Literal classes, never computed, so the build sees them.
 */
export function cellSpan(index: number, count: number): string {
  const last = index === count - 1;
  const phone = last && count % 2 === 1 ? 'col-span-2' : '';
  const remainder = count % 4;
  let wide = '';
  if (remainder === 1 && last) wide = 'md:col-span-4';
  else if (remainder === 2 && index >= count - 2) wide = 'md:col-span-2';
  else if (remainder === 3 && last) wide = 'md:col-span-2';
  return [phone, wide].filter(Boolean).join(' ');
}

/**
 * A space's prices per audience (U9): the general prices first, then the students' under «للطلاب»,
 * each a cell with its label in the interface's language (else the other, marked) or its period's
 * name, and its amount. When any price names one of the space's shifts, the prices are tabs: the
 * whole day's first (the prices with no shift), then each shift that has prices, with its hours.
 */
export function priceGroups(
  prices: Price[],
  shifts: Shift[],
  words: Words,
  language: Language,
): { tabs: PriceTab[] | null; audiences: PriceGroupView[] } {
  const english = language === 'en';
  const audiencesOf = (list: Price[]): PriceGroupView[] =>
    (['GENERAL', 'STUDENT'] as const)
      .map((audience) => {
        const these = list.filter((price) => price.audience === audience);
        return {
          title: audience === 'STUDENT' ? words.prices.students : null,
          cells: these.map((price, index) => ({
            key: `${price.period}-${String(index)}`,
            label: localText(price.labelAr, price.labelEn, english) ?? {
              text: words.prices.periods[price.period],
            },
            value: priceText(price.amountAgorot, language),
            span: cellSpan(index, these.length),
          })),
        };
      })
      .filter((group) => group.cells.length > 0);

  const named = shifts.filter((shift) => prices.some((price) => price.shiftId === shift.id));
  if (named.length === 0)
    return {
      tabs: null,
      audiences: audiencesOf(prices.filter((price) => price.shiftId === null)),
    };

  const whole = prices.filter((price) => price.shiftId === null);
  const tabs: PriceTab[] = [
    ...(whole.length > 0
      ? [
          {
            key: 'whole',
            label: words.prices.wholeDay,
            range: null,
            audiences: audiencesOf(whole),
          },
        ]
      : []),
    ...named.map((shift) => ({
      key: `shift-${String(shift.id)}`,
      label: localText(shift.nameAr, shift.nameEn, english)?.text ?? shift.nameAr,
      range: isolated(`${clockOf(shift.startsMinute)}–${clockOf(shift.endsMinute)}`),
      audiences: audiencesOf(prices.filter((price) => price.shiftId === shift.id)),
    })),
  ];
  return { tabs, audiences: [] };
}
