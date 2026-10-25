import type {
  DataReportField,
  DataReportStatus,
  ReportStatusFilter,
} from '@masaha/shared/data-reports';

import { prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
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

/** A page's bounds. */
interface Page {
  skip: number;
  take: number;
}

/** The lists' status filter, as a condition: the open reports, or the decided ones. */
function statusWhere(status: ReportStatusFilter | undefined): Prisma.DataReportWhereInput {
  if (status === 'OPEN') return { status: 'OPEN' };
  if (status === 'DECIDED') return { status: { not: 'OPEN' } };
  return {};
}

const NEWEST_FIRST = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

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

    /** A page of the user's reports, newest first, then id; and how many pass the filter. */
    async pageOfUser(
      userId: number,
      { status }: { status?: ReportStatusFilter | undefined },
      { skip, take }: Page,
    ): Promise<{ rows: ReportRow[]; total: number }> {
      const where = { userId, ...statusWhere(status) };
      const [rows, total] = await Promise.all([
        prisma.dataReport.findMany({ where, orderBy: NEWEST_FIRST, skip, take, select: REPORT }),
        prisma.dataReport.count({ where }),
      ]);
      return { rows, total };
    },
  };
}

export type DataReportsRepository = ReturnType<typeof createDataReportsRepository>;
