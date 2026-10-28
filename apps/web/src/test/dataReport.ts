import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminReport, SpaceReport } from '@masaha/shared/data-reports';
import type { FakeAnswer } from './fakeAdapter';

/**
 * A report as a space's owner reads it: open, about the opening hours, made at 00:30 on 21 October
 * 2026 in Gaza (21:30 UTC on the 20th).
 */
export function spaceReport(change: Partial<SpaceReport> = {}): SpaceReport {
  return {
    id: 41,
    field: 'HOURS',
    message: 'The space opens at 9, not 8.',
    createdAt: '2026-10-20T21:30:00.000Z',
    status: 'OPEN',
    decision: null,
    ...change,
  };
}

/**
 * A report as the admin reads it: `spaceReport()`'s, of Focus Hub (7, unverified), by Huda Saleh.
 */
export function adminReport(change: Partial<AdminReport> = {}): AdminReport {
  return {
    ...spaceReport(),
    space: { id: 7, slug: 'focus-hub', nameEn: 'Focus Hub', nameAr: 'فوكس هب', verified: false },
    reporter: { id: 9, name: 'Huda Saleh' },
    decidedBy: null,
    ...change,
  };
}

/** A page of reports, with its pagination. */
export function reportsPage(
  rows: unknown[],
  { total = rows.length, currentPage = 1 }: { total?: number; currentPage?: number } = {},
): FakeAnswer {
  const totalPages = Math.ceil(total / 20);
  const meta: PaginationMeta = {
    currentPage,
    limit: 20,
    totalRecords: total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}
