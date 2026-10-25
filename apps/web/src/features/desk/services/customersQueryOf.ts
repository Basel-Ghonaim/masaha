import { DEFAULT_PAGE_SIZE } from '@masaha/shared/core';
import {
  CUSTOMER_KINDS,
  CUSTOMER_STATUS_FILTERS,
  customersQuerySchema,
  PAYMENT_FILTERS,
  type CustomersQuery,
} from '@masaha/shared/desk';

/** The customers list's filters and page, as the address holds them (S11). */
export type CustomersFilters = {
  q?: string;
  status?: (typeof CUSTOMER_STATUS_FILTERS)[number];
  kind?: (typeof CUSTOMER_KINDS)[number];
  payment?: (typeof PAYMENT_FILTERS)[number];
  page: number;
};

/** One of the contract's rules for a query parameter. */
type Rule<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const RULES = customersQuerySchema.shape;

/** A parameter read by the contract's own rule: missing or invalid, it is not there. */
function read<T>(rule: Rule<T>, value: string | null): T | undefined {
  if (value === null) return undefined;
  const result = rule.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * The customers list's filters and page from the address (`?q=&status=&kind=&payment=&page=`, S11),
 * each read by the rule the server applies, so a value it would refuse falls back to none; «مؤرشف»
 * is the owner's only (`customers.archive`), so reception's address never asks it. The query is the
 * filters with the page and its size, 20.
 */
export function customersQueryOf(
  params: URLSearchParams,
  owner: boolean,
): { filters: CustomersFilters; query: CustomersQuery } {
  const q = read(RULES.q, params.get('q'));
  const status = read(RULES.status, params.get('status'));
  const kind = read(RULES.kind, params.get('kind'));
  const payment = read(RULES.payment, params.get('payment'));
  const page = read(RULES.page, params.get('page')) ?? 1;
  const filters: CustomersFilters = {
    ...(q !== undefined && { q }),
    ...(status !== undefined && (owner || status !== 'ARCHIVED') && { status }),
    ...(kind !== undefined && { kind }),
    ...(payment !== undefined && { payment }),
    page,
  };
  return { filters, query: { ...filters, limit: DEFAULT_PAGE_SIZE } };
}

/** The address of the filters and page, the defaults left out. */
export function paramsOf({ q, status, kind, payment, page }: CustomersFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (q !== undefined) params.set('q', q);
  if (status !== undefined) params.set('status', status);
  if (kind !== undefined) params.set('kind', kind);
  if (payment !== undefined) params.set('payment', payment);
  if (page !== 1) params.set('page', String(page));
  return params;
}
