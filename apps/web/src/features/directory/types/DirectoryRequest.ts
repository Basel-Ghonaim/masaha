import type { PRICE_PERIODS } from '@masaha/shared/spaces';
import type { Language } from '@shared/copy';
import type { DirectorySort } from '@masaha/shared/directory';

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
  /** `distance` only with the point in `Masaha-Near`. */
  sort?: DirectorySort;
  lang?: Language;
  page?: number;
};
