import type { SpaceReportsQuery } from '@masaha/shared/data-reports';

/**
 * The capability's keys, each under its audience's scope (docs/frontend/architecture.md §7): a space's
 * reports under the space's.
 */
export const dataReportsKeys = {
  /** Every read of the space's reports: the owner's decision reads them again. */
  spaceAll: (spaceId: number) => ['space', spaceId, 'dataReports'] as const,
  /** One page of the space's reports, by its whole query. */
  space: (spaceId: number, query: SpaceReportsQuery) =>
    ['space', spaceId, 'dataReports', query] as const,
};
