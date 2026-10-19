import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { usersFiltersOf, usersParamsOf, usersRequestOf } from '../../services/usersFiltersOf';
import type { AccountState, UserRoleFilter, UsersFilters } from '../../types/UsersFilters';
import { usePausedSearch } from '../usePausedSearch';

/** The search a field's text makes, read by the server's rule: trimmed, and none when empty. */
const searchOf = (text: string) => usersFiltersOf(new URLSearchParams({ q: text })).q;

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The admin's users list's search, role, state and page, kept in the address so a link, a reload or
 * Back shows the same list (docs/frontend/architecture.md › Where state lives). A value the server
 * would refuse falls back to its default. Choosing a role or a state replaces the address, so Back
 * leaves the page rather than stepping through filters, and returns to the first page; the search
 * does so once typing has paused. The pages are links of their own (`searchOf`).
 *
 * With `fixedRole`, as on the owners page, the list asks for that role alone: the address's role is
 * neither read, nor written, nor counted as a filter.
 */
export function useUsersFilters({ fixedRole }: { fixedRole?: UserRoleFilter }) {
  const [params, setParams] = useSearchParams();
  // The address's filters, its role dropped when the role is fixed.
  const filtersOf = (from: URLSearchParams): UsersFilters => {
    const read = usersFiltersOf(from);
    if (fixedRole === undefined) return read;
    delete read.role;
    return read;
  };
  const filters = filtersOf(params);
  // The address as it stands, for a search written once typing has paused, and for two changes in
  // one event, each written before the address has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const write = (next: UsersFilters) => {
    latest.current = usersParamsOf(next);
    setParams(latest.current, { replace: true });
  };

  const search = usePausedSearch({
    q: filters.q,
    searchOf,
    write: (q) => {
      const current = filtersOf(latest.current);
      if (q !== current.q) write({ ...current, q, page: 1 });
    },
  });

  return {
    filters,
    request: {
      ...usersRequestOf(filters),
      ...(fixedRole !== undefined && { role: fixedRole }),
    },
    search: { text: search.text, change: search.change },
    /** Chooses a role, unless the role is fixed. */
    chooseRole: (role: UserRoleFilter | undefined) => {
      if (fixedRole !== undefined) return;
      write({ ...filtersOf(latest.current), role, page: 1 });
    },
    chooseState: (state: AccountState | undefined) => {
      write({ ...filtersOf(latest.current), state, page: 1 });
    },
    /** Whether a filter applies, the search included. */
    anyApplied:
      filters.q !== undefined || filters.role !== undefined || filters.state !== undefined,
    /** Takes off every filter, the search included. */
    clearAll: () => {
      search.clear();
      write({ page: 1 });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(usersParamsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...filtersOf(latest.current), page });
    },
  };
}
