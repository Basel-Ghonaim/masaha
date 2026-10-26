import { customersQuerySchema } from '@masaha/shared/desk';
import { usePausedSearch } from '@shared/lists';
import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { customersQueryOf, paramsOf, type CustomersFilters } from '../../services/customersQueryOf';

/** The search a field's text makes, read by the server's rule: trimmed, and none when empty. */
const searchOf = (text: string) => {
  const parsed = customersQuerySchema.shape.q.safeParse(text);
  return parsed.success ? parsed.data : undefined;
};

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The customers list's filters and page, kept in the address so a link, a reload or Back shows the
 * same list (S11); a value the server would refuse falls back, and «مؤرشف» is read for the owner
 * only. Choosing a filter replaces the address, so Back leaves the page rather than stepping
 * through filters, and returns to the first page; the search does so once typing has paused. The
 * pages are links of their own (`searchOf`).
 */
export function useCustomersFilters(owner: boolean) {
  const [params, setParams] = useSearchParams();
  const { filters, query } = customersQueryOf(params, owner);
  // The address as it stands, for a search written once typing has paused, and for two changes in
  // one event, each written before the address has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const current = () => customersQueryOf(latest.current, owner).filters;
  // The address is set at once, so two changes in one event build on each other.
  const write = (next: CustomersFilters) => {
    latest.current = paramsOf(next);
    setParams(latest.current, { replace: true });
  };
  const apply = (change: Partial<CustomersFilters>) => {
    write({ ...current(), ...change, page: 1 });
  };

  // The search field's text, which reaches the address once typing pauses.
  const search = usePausedSearch({
    q: filters.q,
    searchOf,
    write: (q) => {
      const now = current();
      if (q !== now.q) write({ ...now, q, page: 1 });
    },
  });

  // The phone's sheet holds the kind and the payment; the status chips stand on every width.
  const applied = [filters.kind !== undefined, filters.payment !== undefined].filter(
    Boolean,
  ).length;

  return {
    filters,
    query,
    search: { text: search.text, change: search.change },
    choose: {
      status: (status: CustomersFilters['status']) => {
        apply({ status });
      },
      kind: (kind: CustomersFilters['kind']) => {
        apply({ kind });
      },
      payment: (payment: CustomersFilters['payment']) => {
        apply({ payment });
      },
    },
    /** How many of the phone's sheet's filters apply: the kind and the payment. */
    applied,
    /** Whether any filter applies, the search and the status included. */
    anyApplied: applied > 0 || filters.q !== undefined || filters.status !== undefined,
    /** Takes off the sheet's filters, keeping the search and the status. */
    clearFilters: () => {
      apply({ kind: undefined, payment: undefined });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(paramsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...current(), page });
    },
  };
}
