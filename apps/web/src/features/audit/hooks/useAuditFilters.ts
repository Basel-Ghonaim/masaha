import { usePausedSearch } from '@shared/lists';
import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { auditParamsOf, auditQueryOf, searchOf, type AuditFilters } from '../services/auditQueryOf';
import type { AuditScope } from '../types/AuditScope';

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * A log's search, period, actor, action type and page, kept in the address so a link, a reload or
 * Back shows the same log (S8): a value the server would refuse falls back to none. Choosing
 * replaces the address, so Back leaves the page rather than stepping through filters, and returns to
 * the first page; the search does so once typing has paused. The pages are links of their own.
 */
export function useAuditFilters(scope: AuditScope) {
  const [params, setParams] = useSearchParams();
  const { filters, request } = auditQueryOf(scope, params);
  // The address as it stands, for a search written once typing has paused, and for two changes in
  // one event, each written before the address has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const current = () => auditQueryOf(scope, latest.current).filters;
  const write = (next: AuditFilters) => {
    latest.current = auditParamsOf(next);
    setParams(latest.current, { replace: true });
  };
  const apply = (change: Partial<AuditFilters>) => {
    write({ ...current(), ...change, page: 1 });
  };

  const search = usePausedSearch({
    q: filters.q,
    searchOf,
    write: (q) => {
      const now = current();
      if (q !== now.q) write({ ...now, q, page: 1 });
    },
  });

  // The phone's sheet holds the period, the actor and the action type; the search stands apart.
  const applied = [
    filters.period !== 'LAST_30_DAYS',
    filters.actor !== undefined,
    filters.group !== undefined,
  ].filter(Boolean).length;

  return {
    filters,
    request,
    search: { text: search.text, change: search.change },
    apply,
    /** How many of the sheet's filters apply: the period, the actor and the action type. */
    applied,
    /** Whether any filter applies, the search included. */
    anyApplied: applied > 0 || filters.q !== undefined,
    /** «مسح الفلاتر»: the sheet's filters taken off, the search kept. */
    clear: () => {
      apply({ period: 'LAST_30_DAYS', actor: undefined, group: undefined });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(auditParamsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...current(), page });
    },
  };
}
