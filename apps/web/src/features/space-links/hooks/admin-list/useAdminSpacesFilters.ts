import { usePausedSearch } from '@shared/lists';
import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { filtersOf, paramsOf, requestOf, type ListStatus } from '../../services/filtersOf';
import type { AdminSpacesFilters } from '../../types/AdminSpacesFilters';
import type { PlaceFilter } from '../../types/PlaceFilter';

/** The search a field's text makes, read by the server's rule: trimmed, and none when empty. */
const searchOf = (text: string) => filtersOf(new URLSearchParams({ q: text })).q;

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The admin's spaces list's filters and page, kept in the address so a link, a reload or Back shows
 * the same list (docs/frontend/architecture.md › Where state lives). A value the server would refuse
 * falls back to its default. Choosing a filter replaces the address, so Back leaves the page rather
 * than stepping through filters, and returns to the first page; the search does so once typing has
 * paused. The pages are links of their own (`searchOf`).
 */
export function useAdminSpacesFilters() {
  const [params, setParams] = useSearchParams();
  const filters = filtersOf(params);
  // The address as it stands, for a search written once typing has paused, and for two changes in
  // one event, each written before the address has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  // The address is set at once, so two changes in one event build on each other.
  const write = (next: AdminSpacesFilters) => {
    latest.current = paramsOf(next);
    setParams(latest.current, { replace: true });
  };
  const apply = (change: Partial<AdminSpacesFilters>) => {
    write({ ...filtersOf(latest.current), ...change, page: 1 });
  };

  // The search field's text, which reaches the address once typing pauses.
  const search = usePausedSearch({
    q: filters.q,
    searchOf,
    write: (q) => {
      const current = filtersOf(latest.current);
      if (q !== current.q) write({ ...current, q, page: 1 });
    },
  });

  // The stale filter is a chip above the sheet on every width, so the sheet's own count and its
  // clear are the two fields it holds (the design counts the same two).
  const applied = [filters.place !== null, filters.status !== undefined].filter(Boolean).length;

  return {
    filters,
    request: requestOf(filters),
    search: { text: search.text, change: search.change },
    chooseStatus: (status: ListStatus | undefined) => {
      apply({ status });
    },
    choosePlace: (place: PlaceFilter) => {
      apply({ place });
    },
    chooseStale: (stale: boolean) => {
      apply({ stale });
    },
    /** How many of the phone's sheet's filters apply: the place and the state. */
    applied,
    /** Whether any filter applies, the search and the stale chip included. */
    anyApplied: applied > 0 || filters.q !== undefined || filters.stale,
    /** Takes off the sheet's filters, the place and the state, keeping the search and the chip. */
    clearFilters: () => {
      apply({ place: null, status: undefined });
    },
    /** Takes off every filter, the search included. */
    clearAll: () => {
      search.clear();
      write({ place: null, stale: false, page: 1 });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(paramsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...filtersOf(latest.current), page });
    },
  };
}
