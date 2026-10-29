import type {
  AdminReportsQuery,
  MyReportsQuery,
  SpaceReportsQuery,
} from '@masaha/shared/data-reports';

/**
 * The capability's keys, each under its audience's scope (docs/frontend/architecture.md §7): a space's
 * reports under the space's, every space's under the admin's.
 */
export const dataReportsKeys = {
  /** Every read of the space's reports: the owner's decision reads them again. */
  spaceAll: (spaceId: number) => ['space', spaceId, 'dataReports'] as const,
  /** One page of the space's reports, by its whole query. */
  space: (spaceId: number, query: SpaceReportsQuery) =>
    ['space', spaceId, 'dataReports', query] as const,
  /** Every read of the admin's reports: the admin's decision reads them again. */
  adminAll: () => ['admin', 'dataReports'] as const,
  /** One page of every space's reports, by its whole query. */
  admin: (query: AdminReportsQuery) => ['admin', 'dataReports', query] as const,
  /** Every read of the user's own reports, under the session's scope: a new report reads them again. */
  mineAll: ['me', 'reports'] as const,
  /** One page of the user's own reports, by its whole query. */
  mine: (query: MyReportsQuery) => ['me', 'reports', query] as const,
};
