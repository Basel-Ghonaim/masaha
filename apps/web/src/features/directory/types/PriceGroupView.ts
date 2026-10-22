import type { LocalText } from '../services/localText';

/** One audience's prices: its title («للطلاب», or none for the general), and its cells. */
export type PriceGroupView = {
  title: string | null;
  cells: { key: string; label: LocalText; value: string; span: string }[];
};
