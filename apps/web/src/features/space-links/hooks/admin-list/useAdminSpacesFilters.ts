import type { SpaceState } from '@masaha/shared/space-links';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { filtersOf, paramsOf, requestOf } from '../../services/filtersOf';
import type { AdminSpacesFilters } from '../../types/AdminSpacesFilters';
import type { PlaceFilter } from '../../types/PlaceFilter';

/** How long the search waits after the last key before it asks again. */
const SEARCH_PAUSE_MS = 400;

/** The search a field's text makes, read by the server's rule: trimmed, and none when empty. */
const searchOf = (text: string) => filtersOf(new URLSearchParams({ q: text })).q;

const search = (params: URLSearchParams) => {
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

  // The search field's text, which reaches the address once typing pauses; an address changed
  // elsewhere (Back, a link, Clear) sets it again. The text the address already reads keeps its own
  // spaces, so a word typed after a pause follows the space before it.
  const [text, setText] = useState(filters.q ?? '');
  const [shownQ, setShownQ] = useState(filters.q);
  if (filters.q !== shownQ) {
    setShownQ(filters.q);
    if (searchOf(text) !== filters.q) setText(filters.q ?? '');
  }

  // The address is set at once, so two changes in one event build on each other.
  const write = (next: AdminSpacesFilters) => {
    latest.current = paramsOf(next);
    setParams(latest.current, { replace: true });
  };
  const apply = (change: Partial<AdminSpacesFilters>) => {
    write({ ...filtersOf(latest.current), ...change, page: 1 });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filtersOf(latest.current);
      const q = searchOf(text);
      if (q !== current.q) {
        latest.current = paramsOf({ ...current, q, page: 1 });
        setParams(latest.current, { replace: true });
      }
    }, SEARCH_PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, setParams]);

  const applied = [filters.place !== null, filters.status !== undefined, filters.stale].filter(
    Boolean,
  ).length;

  return {
    filters,
    request: requestOf(filters),
    search: { text, change: setText },
    chooseStatus: (status: SpaceState | undefined) => {
      apply({ status });
    },
    choosePlace: (place: PlaceFilter) => {
      apply({ place });
    },
    chooseStale: (stale: boolean) => {
      apply({ stale });
    },
    /** How many of the phone's sheet's filters apply: the place, the state, stale only. */
    applied,
    /** Whether any filter applies, the search included. */
    anyApplied: applied > 0 || filters.q !== undefined,
    /** Takes off the sheet's filters, keeping the search. */
    clearFilters: () => {
      apply({ place: null, status: undefined, stale: false });
    },
    /** Takes off every filter, the search included. */
    clearAll: () => {
      setText('');
      write({ place: null, stale: false, page: 1 });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => search(paramsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...filtersOf(latest.current), page });
    },
  };
}
