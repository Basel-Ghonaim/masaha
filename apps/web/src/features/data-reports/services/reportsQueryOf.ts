import { DEFAULT_PAGE_SIZE } from '@masaha/shared/core';
import type { SpaceReportsQuery } from '@masaha/shared/data-reports';

/** The status chips' values: all, the open reports, or those decided (resolved or dismissed). */
export const REPORT_CHIPS = ['all', 'open', 'decided'] as const;
export type ReportChip = (typeof REPORT_CHIPS)[number];

/** The owner's list's filter and page, as the address holds them (S8). */
export type SpaceReportsFilters = { chip: ReportChip; page: number };

/** A positive whole number from the address, else none. */
function positive(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 && number <= 2_147_483_647 ? number : undefined;
}

/** The chip a `?status=` names: `open` or `decided`; anything else is all. */
export function chipOf(value: string | null): ReportChip {
  return value === 'open' || value === 'decided' ? value : 'all';
}

/** The server's status filter for a chip: the API filters `OPEN | DECIDED` only (DI-31). */
export function statusOf(chip: ReportChip): SpaceReportsQuery['status'] {
  if (chip === 'open') return 'OPEN';
  if (chip === 'decided') return 'DECIDED';
  return undefined;
}

/**
 * The owner's filter and page from the address (`?status=open|decided&page=`, S8): a value the
 * server would refuse falls back to none; the query adds the page's size, 20.
 */
export function reportsQueryOf(params: URLSearchParams): {
  filters: SpaceReportsFilters;
  query: SpaceReportsQuery;
} {
  const filters: SpaceReportsFilters = {
    chip: chipOf(params.get('status')),
    page: positive(params.get('page')) ?? 1,
  };
  const status = statusOf(filters.chip);
  return {
    filters,
    query: {
      ...(status !== undefined && { status }),
      page: filters.page,
      limit: DEFAULT_PAGE_SIZE,
    },
  };
}

/** The address of the filter and page, the defaults left out. */
export function reportsParamsOf({ chip, page }: SpaceReportsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (chip !== 'all') params.set('status', chip);
  if (page !== 1) params.set('page', String(page));
  return params;
}
