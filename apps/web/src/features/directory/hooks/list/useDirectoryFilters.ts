import { usePausedSearch } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { filtersOf, paramsOf, searchOf } from '../../services/filtersOf';
import { requestOf } from '../../services/requestOf';
import type { DirectoryFilters } from '../../types/DirectoryFilters';

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The directory's filters, order and page, kept in the address so a link, a reload or Back shows
 * the same list (docs/frontend/architecture.md › Where state lives). A value the server would refuse
 * falls back to its default. A change replaces the address, so Back leaves the page rather than
 * stepping through choices, and returns to the first page; the search does so once typing has
 * paused. A search with no letter to match stays in the field, said, and off the address. The pages
 * are links of their own (`searchOf`).
 */
export function useDirectoryFilters() {
  const [params, setParams] = useSearchParams();
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const filters = filtersOf(params);
  // The address as it stands, for a search written once typing has paused, and for two changes in
  // one event, each written before the address has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const write = (next: DirectoryFilters) => {
    latest.current = paramsOf(next);
    setParams(latest.current, { replace: true });
  };

  const search = usePausedSearch({
    q: filters.q,
    searchOf: (text) => searchOf(text).q,
    write: (q) => {
      const current = filtersOf(latest.current);
      if (q !== current.q) write({ ...current, q, page: 1 });
    },
  });

  // The filters in force, each counted once: the place, the price, «متاحة الآن», «موثّقة», student
  // prices and Friday (design issue 14).
  const applied = [
    filters.areas.length > 0,
    filters.min !== undefined || filters.max !== undefined,
    filters.availableNow,
    filters.verified,
    filters.studentPrices,
    filters.openFriday,
  ].filter(Boolean).length;

  return {
    filters,
    request: requestOf(filters, language),
    search: {
      text: search.text,
      change: search.change,
      refused: searchOf(search.text).refused,
    },
    /** Changes some filters or the order, back on the first page. */
    apply: (change: Partial<DirectoryFilters>) => {
      write({ ...filtersOf(latest.current), ...change, page: 1 });
    },
    /** Takes off every filter, the search and the order. */
    clearAll: () => {
      search.clear();
      write(filtersOf(new URLSearchParams()));
    },
    /** Takes off the filters, keeping the search and the order. */
    clearFilters: () => {
      const current = filtersOf(latest.current);
      write({ ...filtersOf(new URLSearchParams()), q: current.q, sort: current.sort });
    },
    /** How many filters are in force (the search is not one). */
    applied,
    /** Whether anything narrows the list: a filter or the search. */
    anyApplied: applied > 0 || filters.q !== undefined,
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(paramsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...filtersOf(latest.current), page });
    },
  };
}
