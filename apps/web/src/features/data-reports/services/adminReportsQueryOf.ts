import { DEFAULT_PAGE_SIZE } from '@masaha/shared/core';
import {
  DATA_REPORT_FIELDS,
  type AdminReportsQuery,
  type DataReportField,
  type ReportHandler,
} from '@masaha/shared/data-reports';
import { chipOf, statusOf, type ReportChip } from './reportsQueryOf';

/** The admin's filters and page, as the address holds them (S8). */
export type AdminReportsFilters = {
  chip: ReportChip;
  field?: DataReportField;
  /** One space: `spaceId`. */
  spaceId?: number;
  /** Who handles the reports: the admin (an unverified space's) or the owner (a verified one's). */
  handledBy?: ReportHandler;
  page: number;
};

/** «يعالجه» in the address, `admin` or `owner`, as the API's handlers. */
const HANDLERS: Partial<Record<string, ReportHandler>> = { admin: 'ADMIN', owner: 'OWNER' };

/** A positive whole number from the address, else none. */
function positive(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number > 0 && number <= 2_147_483_647 ? number : undefined;
}

/**
 * The admin's filters and page from the address (`?status=open|decided&field=&space=&handledBy=
 * admin|owner&page=`, S8),
 * each read by the server's rule for it, so a value it would refuse falls back to none; the query
 * adds the page's size, 20.
 */
export function adminReportsQueryOf(params: URLSearchParams): {
  filters: AdminReportsFilters;
  query: AdminReportsQuery;
} {
  const field = DATA_REPORT_FIELDS.find((each) => each === params.get('field'));
  const spaceId = positive(params.get('space'));
  const handledBy = HANDLERS[params.get('handledBy') ?? ''];
  const filters: AdminReportsFilters = {
    chip: chipOf(params.get('status')),
    ...(field !== undefined && { field }),
    ...(spaceId !== undefined && { spaceId }),
    ...(handledBy !== undefined && { handledBy }),
    page: positive(params.get('page')) ?? 1,
  };
  const status = statusOf(filters.chip);
  return {
    filters,
    query: {
      ...(status !== undefined && { status }),
      ...(field !== undefined && { field }),
      ...(spaceId !== undefined && { spaceId }),
      ...(handledBy !== undefined && { handledBy }),
      page: filters.page,
      limit: DEFAULT_PAGE_SIZE,
    },
  };
}

/** The address of the filters and page, the defaults left out. */
export function adminReportsParamsOf({
  chip,
  field,
  spaceId,
  handledBy,
  page,
}: AdminReportsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (chip !== 'all') params.set('status', chip);
  if (field !== undefined) params.set('field', field);
  if (spaceId !== undefined) params.set('space', String(spaceId));
  if (handledBy !== undefined) params.set('handledBy', handledBy.toLowerCase());
  if (page !== 1) params.set('page', String(page));
  return params;
}
