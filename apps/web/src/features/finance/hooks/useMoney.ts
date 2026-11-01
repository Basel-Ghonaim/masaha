import { priceText } from '@shared/lib';
import { useLanguage } from '@shared/localisation';

/** The interface's language, as finance writes its words, and an amount in it: «45 ₪», "₪45". */
export function useMoney() {
  const language = useLanguage() === 'en' ? ('en' as const) : ('ar' as const);
  return { language, money: (agorot: number) => priceText(agorot, language) };
}
