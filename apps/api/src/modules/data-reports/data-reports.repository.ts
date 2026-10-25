import type { DataReportField, DataReportStatus } from '@masaha/shared/data-reports';

import type { Tx } from '../../db/index.ts';
import type { DataReportResolver } from '../../generated/prisma/enums.ts';

// Every select names its columns. `REPORT` never names the reporter: a space's list reads only it,
// so no mapper can show the owner who reported (docs/backend/security.md › Authorization).
const REPORT = {
  id: true,
  spaceId: true,
  field: true,
  message: true,
  status: true,
  resolvedAt: true,
  resolutionNote: true,
  resolvedAs: true,
  createdAt: true,
} as const;

/** A report as its space's owner may see it: never who reported it. */
export interface ReportRow {
  id: number;
  spaceId: number;
  field: DataReportField;
  message: string | null;
  status: DataReportStatus;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  resolvedAs: DataReportResolver | null;
  createdAt: Date;
}

/**
 * The `data_reports` table: the users' reports of a space's wrong information, and their decisions.
 */
export function createDataReportsRepository() {
  return {
    /** The user's open report of this space's field, if there is one. */
    findOpen(
      userId: number,
      spaceId: number,
      field: DataReportField,
      tx: Tx,
    ): Promise<ReportRow | null> {
      return tx.dataReport.findFirst({
        where: { userId, spaceId, field, status: 'OPEN' },
        select: REPORT,
      });
    },

    create(
      data: {
        userId: number;
        spaceId: number;
        field: DataReportField;
        message: string | null;
        createdAt: Date;
      },
      tx: Tx,
    ): Promise<ReportRow> {
      return tx.dataReport.create({ data, select: REPORT });
    },
  };
}

export type DataReportsRepository = ReturnType<typeof createDataReportsRepository>;
