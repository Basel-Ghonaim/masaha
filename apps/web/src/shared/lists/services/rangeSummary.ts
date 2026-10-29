import type { PaginationMeta } from '@masaha/shared/core';
import { isolate } from '@shared/localisation';

/** The words a list's range is said in: the range ("1–20") and the total, each already isolated. */
type RangeWords = {
  range: (values: { range: string; total: string }) => string;
};

/**
 * Which records a page of a list shows, of how many: "Showing 1–20 of 312". The range and the
 * total are each isolated, so they read left to right in either language. None for an empty list.
 */
export function rangeSummary(
  meta: Pick<PaginationMeta, 'currentPage' | 'limit' | 'totalRecords'>,
  words: RangeWords,
): string | null {
  if (meta.totalRecords < 1) return null;
  const from = (meta.currentPage - 1) * meta.limit + 1;
  const to = Math.min(meta.currentPage * meta.limit, meta.totalRecords);
  return words.range({
    range: isolate(`${String(from)}–${String(to)}`),
    total: isolate(String(meta.totalRecords)),
  });
}
