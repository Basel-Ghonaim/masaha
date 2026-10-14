import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { isolated } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { priceText } from '../../services/priceText';

/**
 * A verified space's prices to read, every one: its period and audience, then its shift and its
 * label when it has them, in the interface's language (the Arabic one when the English is missing),
 * and its amount in shekels. None while it has no price.
 */
export function useReadOnlyPrices(space: AdminSpace) {
  const copy = useCopy();
  const words = copy.spaces.editor.prices;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const english = language === 'en';
  const shifts = space.hours?.shifts ?? [];

  return {
    title: copy.spaces.editor.sections.prices,
    none: space.prices.length === 0 ? words.none : null,
    prices: space.prices.map((price, index) => {
      const shift = shifts.find(({ id }) => id === price.shiftId);
      const parts = [
        shift && (english ? (shift.nameEn ?? shift.nameAr) : shift.nameAr),
        price.labelAr && (english ? (price.labelEn ?? price.labelAr) : price.labelAr),
      ].filter((part): part is string => typeof part === 'string');
      const label = parts.reduce(
        // A name the admin typed is isolated, so it never reorders the line around it.
        (line, part) => words.withPart({ line, part: isolated(part) }),
        words.summary({
          period: words.periods[price.period],
          audience: words.audiences[price.audience],
        }),
      );
      return { key: index, label, value: priceText(price.amountAgorot, language) };
    }),
  };
}
