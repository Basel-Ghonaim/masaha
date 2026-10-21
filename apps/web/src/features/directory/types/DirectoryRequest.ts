import type { PRICE_PERIODS } from '@masaha/shared/spaces';
import type { Language } from '@shared/copy';
import type { DirectoryOrder } from './DirectoryFilters';

/** The list's query, named as the contract names it (docs/api/api-contract.md › Directory (public)). */
export type DirectoryRequest = {
  limit: number;
  q?: string;
  area?: string;
  period?: (typeof PRICE_PERIODS)[number];
  /** Whole agorot. */
  priceMin?: number;
  priceMax?: number;
  studentPrices?: true;
  openFriday?: true;
  verified?: true;
  availableNow?: true;
  sort?: DirectoryOrder;
  lang?: Language;
  page?: number;
};
