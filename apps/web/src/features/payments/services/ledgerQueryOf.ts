import { addDays, dateSchema, DEFAULT_PAGE_SIZE } from '@masaha/shared/core';
import {
  PAYMENT_KINDS,
  PAYMENT_METHODS,
  PAYMENTS_RANGE_MAX_DAYS,
  type PaymentsQuery,
} from '@masaha/shared/payments';

/** The ledger's filters and page, as the address holds them (S8). */
export type LedgerFilters = {
  /** A range of Gaza dates, both or neither: neither is today. */
  from?: string;
  to?: string;
  /** Who recorded the payment: `recordedById`. */
  staff?: number;
  method?: (typeof PAYMENT_METHODS)[number];
  kind?: (typeof PAYMENT_KINDS)[number];
  /** «إظهار الملغاة»: the voided payments shown too. */
  voided: boolean;
  page: number;
};

/** A positive whole number from the address, else none. */
function positive(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 && number <= 2_147_483_647 ? number : undefined;
}

/** One of `choices`, else none. */
function oneOf<T extends string>(choices: readonly T[], value: string | null): T | undefined {
  return choices.find((choice) => choice === value);
}

/** A Gaza date (`YYYY-MM-DD`) by the contract's rule, else none. */
function date(value: string | null): string | undefined {
  return value !== null && dateSchema.safeParse(value).success ? value : undefined;
}

/** Whether `from`–`to` is a range the server lists: `to` not before `from`, at most 92 days. */
export function rangeAllowed(from: string, to: string): boolean {
  return to >= from && to <= addDays(from, PAYMENTS_RANGE_MAX_DAYS - 1);
}

/**
 * The ledger's filters and page from the address (`?from=&to=&staff=&method=&kind=&voided=1&page=`,
 * S8), each read by the server's rule for it (`paymentsQuerySchema`'s fields, as its refinement
 * hides its shape), so a value it would refuse falls back to none: half a range, an inverted one or
 * one longer than 92 days is dropped whole. The query adds the void filter — the voided ones hidden
 * unless asked for — and the page's size, 20.
 */
export function ledgerQueryOf(params: URLSearchParams): {
  filters: LedgerFilters;
  query: PaymentsQuery;
} {
  const from = date(params.get('from'));
  const to = date(params.get('to'));
  const range = from !== undefined && to !== undefined && rangeAllowed(from, to);
  const staff = positive(params.get('staff'));
  const method = oneOf(PAYMENT_METHODS, params.get('method'));
  const kind = oneOf(PAYMENT_KINDS, params.get('kind'));
  const filters: LedgerFilters = {
    ...(range && { from, to }),
    ...(staff !== undefined && { staff }),
    ...(method !== undefined && { method }),
    ...(kind !== undefined && { kind }),
    voided: params.get('voided') === '1',
    page: positive(params.get('page')) ?? 1,
  };
  return { filters, query: queryOf(filters) };
}

/** The server's query for the filters. */
function queryOf({ from, to, staff, method, kind, voided, page }: LedgerFilters): PaymentsQuery {
  return {
    ...(from !== undefined && to !== undefined && { from, to }),
    ...(staff !== undefined && { recordedById: staff }),
    ...(method !== undefined && { method }),
    ...(kind !== undefined && { kind }),
    voided: voided ? 'INCLUDE' : 'EXCLUDE',
    page,
    limit: DEFAULT_PAGE_SIZE,
  };
}

/** The address of the filters and page, the defaults left out. */
export function paramsOf({
  from,
  to,
  staff,
  method,
  kind,
  voided,
  page,
}: LedgerFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (from !== undefined && to !== undefined) {
    params.set('from', from);
    params.set('to', to);
  }
  if (staff !== undefined) params.set('staff', String(staff));
  if (method !== undefined) params.set('method', method);
  if (kind !== undefined) params.set('kind', kind);
  if (voided) params.set('voided', '1');
  if (page !== 1) params.set('page', String(page));
  return params;
}
