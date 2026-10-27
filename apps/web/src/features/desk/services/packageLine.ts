import type { SpacePackage } from '@masaha/shared/packages';
import type { PackageChoice } from '../types/PackageChoice';
import { termsLine } from './termsLine';

/**
 * A package as the sheet offers it, in one line (DK-007): its name; its price, or its rate with its
 * unit when it is billed from attendance; then its validity and its terms, as a subscription's card
 * says them. The figures are the package's, which the subscription copies.
 */
export function packageLine(
  pkg: SpacePackage,
  words: {
    validity: (values: { count: number }) => string;
    rate: (values: { rate: string; unit: string }) => string;
    units: { PER_HOUR: string; PER_DAY: string };
    terms: Parameters<typeof termsLine>[1];
  },
  price: (agorot: number) => string,
): PackageChoice {
  return {
    value: `pkg-${String(pkg.id)}`,
    title: pkg.name,
    amount:
      pkg.billing === 'FIXED'
        ? price(pkg.priceAgorot)
        : words.rate({ rate: price(pkg.priceAgorot), unit: words.units[pkg.billing] }),
    terms: [words.validity({ count: pkg.validityDays }), termsLine(pkg, words.terms)].join(' · '),
  };
}
