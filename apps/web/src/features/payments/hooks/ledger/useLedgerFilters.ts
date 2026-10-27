import { useCopy } from '@shared/copy';
import { useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  ledgerQueryOf,
  paramsOf,
  rangeAllowed,
  type LedgerFilters,
} from '../../services/ledgerQueryOf';

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The ledger's filters and page, kept in the address so a link, a reload or Back shows the same list
 * (S8): a value the server would refuse falls back to none. Choosing a filter replaces the address,
 * so Back leaves the page rather than stepping through filters, and returns to the first page; a
 * range longer than 92 days is not written, and says so. «مسح الفلاتر» takes off every one, the
 * range and «إظهار الملغاة» included (DI-3). The pages are links of their own (`searchOf`).
 */
export function useLedgerFilters() {
  const words = useCopy().payments.ledger;
  const [params, setParams] = useSearchParams();
  const { filters, query } = ledgerQueryOf(params);
  const [tooLong, setTooLong] = useState(false);
  // The address as it stands, for two changes in one event, each written before it has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const current = () => ledgerQueryOf(latest.current).filters;
  const write = (next: LedgerFilters) => {
    latest.current = paramsOf(next);
    setParams(latest.current, { replace: true });
  };
  const apply = (change: Partial<LedgerFilters>) => {
    write({ ...current(), ...change, page: 1 });
  };

  // The range, the staff member, the method and the kind: what the phone's sheet holds and counts.
  const applied = [
    filters.from !== undefined,
    filters.staff !== undefined,
    filters.method !== undefined,
    filters.kind !== undefined,
  ].filter(Boolean).length;

  return {
    filters,
    query,
    choose: {
      /** A range of Gaza dates, both ends included; none is today. */
      range: (from?: string, to?: string) => {
        if (from === undefined || to === undefined) {
          setTooLong(false);
          apply({ from: undefined, to: undefined });
          return;
        }
        const [start, end] = to < from ? [to, from] : [from, to];
        if (!rangeAllowed(start, end)) {
          setTooLong(true);
          return;
        }
        setTooLong(false);
        apply({ from: start, to: end });
      },
      staff: (staff?: number) => {
        apply({ staff });
      },
      method: (method?: LedgerFilters['method']) => {
        apply({ method });
      },
      kind: (kind?: LedgerFilters['kind']) => {
        apply({ kind });
      },
      voided: (voided: boolean) => {
        apply({ voided });
      },
    },
    /** A range over 92 days, chosen and not written. */
    rangeError: tooLong ? words.range.tooLong : null,
    /** How many of the sheet's filters apply: the range, the staff member, the method, the kind. */
    applied,
    /** Whether any filter applies, «إظهار الملغاة» included. */
    anyApplied: applied > 0 || filters.voided,
    /** Takes off every filter, the range and «إظهار الملغاة» included (DI-3). */
    clear: () => {
      setTooLong(false);
      write({ voided: false, page: 1 });
    },
    /** The address of a page, with the filters kept. */
    searchOf: (page: number) => addressOf(paramsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...current(), page });
    },
  };
}
