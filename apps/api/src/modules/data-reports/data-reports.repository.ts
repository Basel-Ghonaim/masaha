import type {
  DataReportDecision,
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

/** A report under its decision's lock: who decided it, to tell a retry from another decision. */
export interface LockedReport extends ReportRow {
  resolvedById: number | null;
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

    /**
     * A page of the space's reports, newest first, then id, filtered by status and field; and how
     * many pass. Its select has no reporter: the owner's list never holds one.
     */
    async pageOfSpace(
      spaceId: number,
      {
        status,
        field,
      }: { status?: ReportStatusFilter | undefined; field?: DataReportField | undefined },
      { skip, take }: Page,
    ): Promise<{ rows: ReportRow[]; total: number }> {
      const where = { spaceId, ...statusWhere(status), ...(field ? { field } : {}) };
      const [rows, total] = await Promise.all([
        prisma.dataReport.findMany({ where, orderBy: NEWEST_FIRST, skip, take, select: REPORT }),
        prisma.dataReport.count({ where }),
      ]);
      return { rows, total };
    },

    /** The space a report is about, read without a lock; `null` for no such report. */
    async findSpaceOf(id: number): Promise<number | null> {
      const row = await prisma.dataReport.findUnique({ where: { id }, select: { spaceId: true } });
      return row?.spaceId ?? null;
    },

    /** Locks the report's row (`FOR UPDATE`) and answers it with who decided it. */
    async lockIn(id: number, tx: Tx): Promise<LockedReport> {
      await tx.$queryRaw`SELECT id FROM data_reports WHERE id = ${id} FOR UPDATE`;
      return tx.dataReport.findUniqueOrThrow({
        where: { id },
        select: { ...REPORT, resolvedById: true },
      });
    },

    /** Writes a decision's fields together (the CHECKs of `data_report_rules`). */
    decide(
      id: number,
      data: {
        status: DataReportDecision;
        resolvedById: number;
        resolvedAt: Date;
        resolutionNote: string | null;
        resolvedAs: DataReportResolver;
      },
      tx: Tx,
    ): Promise<ReportRow> {
      return tx.dataReport.update({ where: { id }, data, select: REPORT });
    },
  };
}

export type DataReportsRepository = ReturnType<typeof createDataReportsRepository>;
