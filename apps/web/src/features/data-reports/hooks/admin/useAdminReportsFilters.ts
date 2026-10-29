import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  adminReportsParamsOf,
  adminReportsQueryOf,
  type AdminReportsFilters,
} from '../../services/adminReportsQueryOf';

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The admin's status chip, field, space and page, kept in the address so a link (`?space=` from a
 * space's page), a reload or Back shows the same list (S8): a value the server would refuse falls
 * back to none. Choosing replaces the address, so Back leaves the page rather than stepping through
 * filters, and returns to the first page. «مسح الفلاتر» takes off the space and the field; «عرض الكل»
 * every filter, the chip included. The pages are links of their own (`searchOf`).
 */
export function useAdminReportsFilters() {
  const [params, setParams] = useSearchParams();
  const { filters, query } = adminReportsQueryOf(params);
  // The address as it stands, for two changes in one event, each written before it has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const current = () => adminReportsQueryOf(latest.current).filters;
  const write = (next: AdminReportsFilters) => {
    latest.current = adminReportsParamsOf(next);
    setParams(latest.current, { replace: true });
  };
  const apply = (change: Partial<AdminReportsFilters>) => {
    write({ ...current(), ...change, page: 1 });
  };

  return {
    filters,
    query,
    apply,
    /** How many of the filters the sheet holds apply: the space and the field. */
    applied: [filters.spaceId, filters.field].filter((value) => value !== undefined).length,
    /** «مسح الفلاتر»: the space and the field taken off, the chip kept. */
    clear: () => {
      write({ chip: current().chip, page: 1 });
    },
    /** «عرض الكل»: every filter taken off, the chip included. */
    showAll: () => {
      write({ chip: 'all', page: 1 });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(adminReportsParamsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...current(), page });
    },
  };
}
