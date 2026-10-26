import type { Price, Shift } from '@masaha/shared/spaces';
import type { PackageChoice } from '../types/PackageChoice';
import type { PublishedChoice } from './sheetRequest';

/** The days a published period runs, both ends counted (spec D, the owner's §14.4). */
const DAYS = { WEEK: 7, MONTH: 30 } as const;

/** A published price the sheet offers: its line, the request it makes, and what it costs. */
export type PublishedOption = {
  line: PackageChoice;
  request: PublishedChoice;
  amountAgorot: number;
  days: number;
};

/**
 * The space's published week and month prices as the sheet offers them (spec D): the standard ones
 * only (a custom label is not subscribable), in the order the space shows them, each named «أسبوعي»
 * or «شهري», then «· للطلاب» for students and its shift's name — the name the subscription is given,
 * in the desk's language — and sent by its key (`published`), never by a price's id: the server reads
 * its amount when the subscription is made.
 */
export function publishedChoices(
  prices: readonly Price[],
  shifts: readonly Shift[] | null,
  words: {
    periods: { WEEK: string; MONTH: string };
    students: string;
    validity: (values: { count: number }) => string;
  },
  { language, price }: { language: 'ar' | 'en'; price: (agorot: number) => string },
): PublishedOption[] {
  return prices.flatMap((one) => {
    if ((one.period !== 'WEEK' && one.period !== 'MONTH') || one.labelAr !== null) return [];
    const shift = shifts?.find(({ id }) => id === one.shiftId);
    const name = [
      one.audience === 'STUDENT'
        ? `${words.periods[one.period]} ${words.students}`
        : words.periods[one.period],
      shift && (language === 'en' ? (shift.nameEn ?? shift.nameAr) : shift.nameAr),
    ]
      .filter((part) => typeof part === 'string' && part !== '')
      .join(' · ');
    const days = DAYS[one.period];
    return [
      {
        line: {
          value: `price-${one.period}-${one.audience}-${one.shiftId === null ? 'none' : String(one.shiftId)}`,
          title: name,
          amount: price(one.amountAgorot),
          terms: words.validity({ count: days }),
        },
        request: {
          period: one.period,
          audience: one.audience,
          ...(one.shiftId !== null && { shiftId: one.shiftId }),
          name: name.slice(0, 60),
        },
        amountAgorot: one.amountAgorot,
        days,
      },
    ];
  });
}
