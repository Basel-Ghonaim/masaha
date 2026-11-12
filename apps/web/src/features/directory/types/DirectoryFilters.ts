import type { PRICE_PERIODS } from '@masaha/shared/spaces';

/**
 * The orders the list offers by name; `relevance` only while a search is typed; the price orders
 * only while a subscription is chosen.
 */
export type DirectoryOrder = 'updated' | 'name' | 'relevance' | 'priceAsc' | 'priceDesc';

/** How the directory shows the spaces: a list a page at a time, or every pin on a map. */
export type DirectoryViewKind = 'list' | 'map';

/**
 * The directory's filters, order, page and view, as the address holds them: the subscription, none
 * for «الكل», with its budget in whole shekels; an order only when one is chosen.
 */
export type DirectoryFilters = {
  q: string | undefined;
  areas: number[];
  /** The subscription; `undefined`: «الكل», no price filter. */
  period: (typeof PRICE_PERIODS)[number] | undefined;
  min: number | undefined;
  max: number | undefined;
  /** «مفتوحة الآن»: open now by the hours. */
  openNow: boolean;
  /** «مفتوحة مساءً»: its owner declares the space works in the evening. */
  evening: boolean;
  /** «قاعة للنساء»: the space has the women's hall (W5). */
  womensHall: boolean;
  verified: boolean;
  studentPrices: boolean;
  openFriday: boolean;
  sort: DirectoryOrder | undefined;
  page: number;
  view: DirectoryViewKind;
};
