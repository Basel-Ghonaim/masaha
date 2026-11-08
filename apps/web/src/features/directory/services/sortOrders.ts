import type { PRICE_PERIODS } from '@masaha/shared/spaces';
import type { Catalogue } from '@shared/copy';
import type { DirectoryOrder } from '../types/DirectoryFilters';

type Period = (typeof PRICE_PERIODS)[number];

/**
 * The orders the list offers: best match first while a search applies, then the latest update and
 * the name; the cheapest and the dearest of the subscription only while one is chosen — absent, not
 * disabled, under «الكل».
 */
export function sortOrders({
  searching,
  period,
}: {
  searching: boolean;
  period: Period | undefined;
}): DirectoryOrder[] {
  return [
    ...(searching ? (['relevance'] as const) : []),
    'updated',
    'name',
    ...(period === undefined ? [] : (['priceAsc', 'priceDesc'] as const)),
  ];
}

/** An order's words; a price order named by the subscription's price, «الأرخص شهريًا». */
export function sortLabelOf(
  order: DirectoryOrder | 'distance',
  period: Period | undefined,
  words: Catalogue['directory']['sort'],
): string {
  if (order === 'priceAsc' || order === 'priceDesc') {
    return period === undefined ? '' : words[order][period];
  }
  return words.options[order];
}
