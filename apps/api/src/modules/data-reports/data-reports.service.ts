import type {
  AdminReport,
  AdminReportsQuery,
  CreateReportRequest,
  DecideReportRequest,
  MyReport,
  MyReportsQuery,
  SpaceReport,
  SpaceReportsQuery,
} from '@masaha/shared/data-reports';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { DataReportResolver } from '../../generated/prisma/enums.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace, type SpaceLink } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { toSkip } from '../../shared/http/index.ts';
import type { LookupsService } from '../lookups/index.ts';
import type { SpaceLinksService } from '../space-links/index.ts';
import type { PublicListingService, PublicSpaceService, SpacesService } from '../spaces/index.ts';
import type { UsersService } from '../users/index.ts';
import { toAdminReport, toMyReport, toSpaceReport } from './data-reports.mapper.ts';
import {
  createDataReportsRepository,
  type ReportRow,
  type ReportWithPeople,
} from './data-reports.repository.ts';
import { decisionOf } from './decision.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  publicSpace: PublicSpaceService;
  publicListing: PublicListingService;
  lookups: LookupsService;
  spaceLinks: SpaceLinksService;
  users: UsersService;
  /** The one clock (conventions §11): a report is dated by it. */
  now: () => Date;
}

/**
 * The users' reports of a space's wrong information (docs/backend/conventions.md §7): sent by a
 * signed-in user about a listed space, read by the reporter, read and decided by the space's owner,
 * or by the admin while the space is unverified.
 */
export function createDataReportsService({
  runInTransaction,
  audit,
  spaces,
  publicSpace,
  publicListing,
  lookups,
  spaceLinks,
  users,
  now,
}: Dependencies) {
  const repository = createDataReportsRepository();

  /** Which of these spaces are publicly listed now, as the directory lists them (S12). */
  async function listedAmong(spaceIds: readonly number[]): Promise<Set<number>> {
    if (spaceIds.length === 0) return new Set();
    const { rows } = await publicListing.upTo(
      { areaIds: await lookups.listedAreaIds(), verifiedIds: [], onlyIds: spaceIds },
      spaceIds.length,
    );
    return new Set(rows.map(({ id }) => id));
  }

  /**
   * These reports as the admin sees them: their spaces' names and whether each is verified, and
   * the names of who reported and who decided them, one query each.
   */
  async function asAdminReports(rows: readonly ReportWithPeople[]): Promise<AdminReport[]> {
    const spaceIds = [...new Set(rows.map(({ spaceId }) => spaceId))];
    const people = [
      ...new Set(rows.flatMap(({ userId, resolvedById }) => [userId, resolvedById ?? userId])),
    ];
    const [spaceNames, verifiedIds, names] = await Promise.all([
      spaces.namesWithDeleted(spaceIds),
      spaceLinks.verifiedSpaceIds(),
      users.namesFor(people),
    ]);
    const byId = new Map(spaceNames.map((space) => [space.id, space]));
    const verified = new Set(verifiedIds);
    const nameOf = new Map(names.map(({ id, name }) => [id, name]));
    return rows.flatMap((row) => {
      const space = byId.get(row.spaceId);
      return space ? [toAdminReport(row, space, verified.has(row.spaceId), nameOf)] : [];
    });
  }

  /**
   * Decides a report, in one transaction and in this order: the report's space, read without a
   * lock, the expected one when one is (else `not_found`); the space's lock (`not_found` once it is
   * deleted); `can('dataReports.resolve')` on the links read under it, so an owner linked or
   * unlinked meanwhile decides; the report's row, locked; `decisionOf`: a retry answered as it is,
   * writing nothing, another decision of a decided report `REPORT_ALREADY_DECIDED`; else the
   * decision, by `resolvedAs`, audited with its reply.
   */
  async function decideUnder(
    actor: Actor,
    reportId: number,
    request: DecideReportRequest,
    {
      spaceId,
      linksUnder,
      resolvedAs,
    }: {
      spaceId: number | null;
      linksUnder: (spaceId: number, tx: Tx) => Promise<readonly SpaceLink[]>;
      resolvedAs: DataReportResolver;
    },
  ): Promise<ReportRow> {
    const reportSpaceId = await repository.findSpaceOf(reportId);
    if (reportSpaceId === null || (spaceId !== null && reportSpaceId !== spaceId)) {
      throw AppError.notFound(undefined, 'Report not found');
    }
    return runInTransaction(async (tx) => {
      if (!(await spaces.lock(reportSpaceId, tx))) {
        throw AppError.notFound(undefined, 'Report not found');
      }
      if (!can(actor, 'dataReports.resolve', { links: await linksUnder(reportSpaceId, tx) })) {
        throw AppError.forbidden();
      }
      const current = await repository.lockIn(reportId, tx);
      const outcome = decisionOf(current, request, actor.id);
      if (outcome === 'as-is') return current;
      if (outcome === 'conflict') throw AppError.conflict('REPORT_ALREADY_DECIDED');

      const note = request.note ?? null;
      const decided = await repository.decide(
        reportId,
        {
          status: request.status,
          resolvedById: actor.id,
          resolvedAt: now(),
          resolutionNote: note,
          resolvedAs,
        },
        tx,
      );
      await audit(
        {
          actorId: actor.id,
          action: request.status === 'RESOLVED' ? 'dataReport.resolved' : 'dataReport.dismissed',
          entityType: 'dataReport',
          entityId: reportId,
          spaceId: reportSpaceId,
          after: { note },
        },
        tx,
      );
      return decided;
    });
  }

  return {
    /**
     * A page of the space's reports, newest first, by status and field, as its owner reads them:
     * never who reported them; and how many there are. Read without a lock.
     */
    async ofSpace(
      spaceId: number,
      { status, field, page, limit }: SpaceReportsQuery,
    ): Promise<{ rows: SpaceReport[]; total: number }> {
      const { rows, total } = await repository.pageOfSpace(
        spaceId,
        { status, field },
        { skip: toSkip({ page, limit }), take: limit },
      );
      return { rows: rows.map(toSpaceReport), total };
    },

    /** The space's owner decides one of its reports (`decideUnder`), on its links under the lock. */
    async decideAtSpace(
      actor: Actor,
      space: LoadedSpace,
      reportId: number,
      request: DecideReportRequest,
    ): Promise<SpaceReport> {
      const decided = await decideUnder(actor, reportId, request, {
        spaceId: space.id,
        linksUnder: (_spaceId, tx) => space.linksUnder(tx),
        resolvedAs: 'OWNER',
      });
      return toSpaceReport(decided);
    },

    /**
     * A page of every report, newest first, by status, field and space, as the admin reads them:
     * with who reported and who decided; a soft-deleted space's left out. Read without a lock.
     */
    async all({
      status,
      field,
      spaceId,
      page,
      limit,
    }: AdminReportsQuery): Promise<{ rows: AdminReport[]; total: number }> {
      const { rows, total } = await repository.pageAll(
        { status, field, spaceId },
        { skip: toSkip({ page, limit }), take: limit },
      );
      return { rows: await asAdminReports(rows), total };
    },

    /**
     * The admin decides a report (`decideUnder`), on its space's links read under the lock: an
     * unverified space's only, so an owner linked meanwhile makes it `forbidden`.
     */
    async decideAsAdmin(
      actor: Actor,
      reportId: number,
      request: DecideReportRequest,
    ): Promise<AdminReport> {
      await decideUnder(actor, reportId, request, {
        spaceId: null,
        linksUnder: (spaceId, tx) => spaceLinks.linksAt(spaceId, tx),
        resolvedAs: 'ADMIN',
      });
      const [decided] = await asAdminReports([await repository.findWithPeople(reportId)]);
      if (!decided) throw AppError.notFound(undefined, 'Report not found');
      return decided;
    },

    /**
     * A page of the user's own reports, newest first, all or open or decided, each with its
     * decision and its space's names, `listed: false` once the space left the directory; and how
     * many there are. The same few queries whatever the page's size.
     */
    async mine(
      actor: Actor,
      { status, page, limit }: MyReportsQuery,
    ): Promise<{ rows: MyReport[]; total: number }> {
      const { rows, total } = await repository.pageOfUser(
        actor.id,
        { status },
        { skip: toSkip({ page, limit }), take: limit },
      );
      const spaceIds = [...new Set(rows.map(({ spaceId }) => spaceId))];
      const [names, listed] = await Promise.all([
        spaces.namesWithDeleted(spaceIds),
        listedAmong(spaceIds),
      ]);
      const byId = new Map(names.map((space) => [space.id, space]));
      return {
        rows: rows.flatMap((row) => {
          const space = byId.get(row.spaceId);
          return space ? [toMyReport(row, space, listed.has(row.spaceId))] : [];
        }),
        total,
      };
    },

    /**
     * Reports a listed space's field, in one transaction and in this order: the space as its page
     * shows it — shown, in a listed area — else `not_found`; the user's lock, so one user's reports
     * are serialised; the user's open report of that field, answered as it is, writing nothing; else
     * the new report, open. `created` says which.
     */
    async create(
      actor: Actor,
      slug: string,
      request: CreateReportRequest,
    ): Promise<{ report: MyReport; created: boolean }> {
      const shown = await publicSpace.findShown(slug);
      if (!shown || !(await lookups.isActiveArea(shown.areaId))) {
        throw AppError.notFound(undefined, 'Space not found');
      }
      const [names] = await spaces.namesWithDeleted([shown.id]);
      if (!names) throw AppError.notFound(undefined, 'Space not found');

      return runInTransaction(async (tx) => {
        if (!(await users.lockAccount(actor.id, tx))) throw AppError.unauthorized();
        const open = await repository.findOpen(actor.id, shown.id, request.field, tx);
        if (open) return { report: toMyReport(open, names, true), created: false };

        const created = await repository.create(
          {
            userId: actor.id,
            spaceId: shown.id,
            field: request.field,
            message: request.message ?? null,
            createdAt: now(),
          },
          tx,
        );
        return { report: toMyReport(created, names, true), created: true };
      });
    },
  };
}

export type DataReportsService = ReturnType<typeof createDataReportsService>;
