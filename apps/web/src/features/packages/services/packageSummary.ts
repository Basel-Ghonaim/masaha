import type { SpacePackage } from '@masaha/shared/packages';
import type { Catalogue } from '@shared/copy';
import { priceText } from '@shared/lib';
import { isolate } from '@shared/localisation';
import type { ShiftChoice } from '../types/ShiftChoice';
import { LIMIT_NAMES } from './packageValues';

type Words = Catalogue['packages'];
type Language = 'ar' | 'en';

/** The terms a summary words: a package's, or the sheet's as far as they are typed (`null`: not yet). */
export type SummaryTerms = Pick<
  SpacePackage,
  'totalDays' | 'daysPerWeek' | 'hoursPerDay' | 'totalHours' | 'audience' | 'shiftId'
> & { validityDays: number | null };

/** A shift's name in the interface's language: its English one when it has one, else its Arabic. */
export function shiftNameOf(shift: ShiftChoice, language: Language): string {
  return language === 'en' ? (shift.nameEn ?? shift.nameAr) : shift.nameAr;
}

/**
 * A package's terms in one line: its validity, each limit it sets, «للطلاب» for the students, and
 * its shift's name, joined by « · », every count in its plural form.
 */
export function summaryOf(
  terms: SummaryTerms,
  shifts: readonly ShiftChoice[] | null,
  words: Words,
  language: Language,
): string {
  const lines = words.summary;
  const parts: string[] = [];
  if (terms.validityDays !== null) parts.push(lines.validity({ count: terms.validityDays }));
  for (const name of LIMIT_NAMES) {
    const count = terms[name];
    if (count !== null) parts.push(lines[name]({ count }));
  }
  if (terms.audience === 'STUDENT') parts.push(lines.students);
  const shift = shifts?.find(({ id }) => id === terms.shiftId);
  if (shift !== undefined) parts.push(shiftNameOf(shift, language));
  return parts.join(lines.separator);
}

/**
 * A package's price: the amount when it is fixed, else the rate per hour or per day, the amount
 * isolated in its line so its digits and sign never reorder the words around them.
 */
export function priceLineOf(
  { billing, priceAgorot }: Pick<SpacePackage, 'billing' | 'priceAgorot'>,
  words: Words,
  language: Language,
): string {
  const price = priceText(priceAgorot, language);
  if (billing === 'PER_HOUR') return words.price.perHour({ price: isolate(price) });
  if (billing === 'PER_DAY') return words.price.perDay({ price: isolate(price) });
  return price;
}
