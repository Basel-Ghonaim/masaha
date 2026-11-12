import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { pricesTable } from '../../services/pricesView';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/**
 * «الأسعار المعلنة», read first (R9): a small table — the period, «لمن» only when a student price
 * exists, the shift only where a price names one, and the amount in shekels; a price with a custom
 * label shows its label (kept, never edited, R6). For display only, paid at the space; the owner is
 * told Packages & prices shows them too. With none, «لم تُضف أسعار بعد» and «إضافة سعر».
 */
export function usePricesSection(host: SectionHost) {
  const copy = useCopy();
  const words = copy.spaces.editor.prices;
  const english = useLanguage() === 'en';
  const { space } = host;
  const open = () => {
    host.openSheet('prices');
  };
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'prices',
    editable: host.editable,
    empty: space.prices.length === 0,
    edit: open,
  });
  return {
    frame,
    table: pricesTable(space, words, english),
    note: host.place === 'owner' ? `${words.viewNote} ${words.ownerNote}` : words.viewNote,
    empty:
      space.prices.length === 0
        ? {
            text: words.empty.text,
            action: host.editable ? { label: words.empty.action, run: open, primary: true } : null,
          }
        : null,
  };
}

export type PricesSectionView = ReturnType<typeof usePricesSection>;
