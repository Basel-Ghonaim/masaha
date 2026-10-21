import type { PRICE_PERIODS } from '@masaha/shared/spaces';

/** The orders the list offers by name; `relevance` only while a search is typed. */
export type DirectoryOrder = 'updated' | 'name' | 'relevance';

/**
 * The directory's filters, order and page, as the address holds them: the budget in whole shekels,
 * an order only when one is chosen.
 */
export type DirectoryFilters = {
  q: string | undefined;
  areas: number[];
  period: (typeof PRICE_PERIODS)[number];
  min: number | undefined;
  max: number | undefined;
  availableNow: boolean;
  verified: boolean;
  studentPrices: boolean;
  openFriday: boolean;
  sort: DirectoryOrder | undefined;
  page: number;
};
