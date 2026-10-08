/** A page number, or a gap where page numbers are left out. */
export type PageItem = number | 'gap-start' | 'gap-end';

// Seven places at most: the first and last pages, the current one with its neighbours, and gaps.
const MOST = 7;

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

/**
 * The page numbers a list of `total` pages shows around page `current`: every page when there are
 * seven or fewer; otherwise the first and the last, the current one with its neighbours, and a gap
 * for each run left out, always seven places, so the row keeps its width as the page changes.
 */
export function pageItems(current: number, total: number): PageItem[] {
  if (total <= MOST) return range(1, total);
  const start = Math.max(2, Math.min(current - 1, total - 4));
  const end = Math.min(total - 1, Math.max(current + 1, 5));
  return [
    1,
    ...(start > 2 ? (['gap-start'] as const) : []),
    ...range(start, end),
    ...(end < total - 1 ? (['gap-end'] as const) : []),
    total,
  ];
}
