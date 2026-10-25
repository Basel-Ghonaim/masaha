import type { MyReport, ReportDecision, SpaceReport } from '@masaha/shared/data-reports';

import type { SpaceName } from '../spaces/index.ts';
import type { ReportRow } from './data-reports.repository.ts';

/** A decided report's decision, who replied as stored with it; `null` while it is open. */
function decisionOf(row: ReportRow): ReportDecision | null {
  if (row.status === 'OPEN' || row.resolvedAt === null || row.resolvedAs === null) return null;
  return {
    status: row.status,
    at: row.resolvedAt.toISOString(),
    note: row.resolutionNote,
    repliedBy: row.resolvedAs === 'OWNER' ? 'SPACE' : 'MASAHA',
  };
}

/** A report as its space's owner sees it: the row holds no reporter to show. */
export function toSpaceReport(row: ReportRow): SpaceReport {
  return {
    id: row.id,
    field: row.field,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    decision: decisionOf(row),
  };
}

/** A report as its reporter sees it, with its space's names and whether it is listed. */
export function toMyReport(row: ReportRow, space: SpaceName, listed: boolean): MyReport {
  return {
    ...toSpaceReport(row),
    space: { id: space.id, slug: space.slug, nameEn: space.nameEn, nameAr: space.nameAr, listed },
  };
}
