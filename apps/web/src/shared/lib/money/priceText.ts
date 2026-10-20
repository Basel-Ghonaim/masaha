/**
 * An amount in agorot as a price reads in the interface's language: shekels (ILS), with no decimals
 * when it is whole and two otherwise, in Western digits in Arabic too (docs/frontend/localisation.md
 * › Formatting). The page sets it left to right.
 */
export function priceText(agorot: number, language: 'ar' | 'en'): string {
  const decimals = agorot % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-latn' : 'en', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(agorot / 100);
}
