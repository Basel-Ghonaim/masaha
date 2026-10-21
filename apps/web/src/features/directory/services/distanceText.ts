import type { Language } from '@shared/copy';

/**
 * A distance's number of kilometres, as a card says it: one decimal under 10 km and whole from 10,
 * never a trailing «.0», in Western digits in either language (design issue 9).
 */
export function distanceText(meters: number, language: Language): string {
  const km = meters / 1000;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-latn' : 'en', {
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km);
}
