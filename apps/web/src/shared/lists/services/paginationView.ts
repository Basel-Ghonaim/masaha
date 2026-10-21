import type { PaginationView } from '../types/PaginationView';
import { pageItems } from './pageItems';

/** The words a list's pages are said in. */
type PaginationWords = {
  label: string;
  more: string;
  previous: string;
  next: string;
  page: (values: { page: number }) => string;
  summary: (values: { page: number; total: number }) => string;
};

/**
 * A paged list's pages, page `current` of `total`, each a link to the address `searchOf` gives it;
 * none for a list of one page or none.
 */
export function paginationView({
  current,
  total,
  words,
  searchOf,
}: {
  current: number;
  total: number;
  words: PaginationWords;
  searchOf: (page: number) => string;
}): PaginationView | null {
  if (total <= 1) return null;
  return {
    label: words.label,
    more: words.more,
    summary: words.summary({ page: current, total }),
    previous: { label: words.previous, search: current > 1 ? searchOf(current - 1) : null },
    next: { label: words.next, search: current < total ? searchOf(current + 1) : null },
    items: pageItems(current, total).map((item) =>
      typeof item === 'number'
        ? {
            kind: 'page' as const,
            page: item,
            label: words.page({ page: item }),
            search: searchOf(item),
            current: item === current,
          }
        : { kind: 'gap' as const, key: item },
    ),
  };
}
