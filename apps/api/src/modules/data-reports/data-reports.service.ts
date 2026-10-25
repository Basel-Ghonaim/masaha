import type { CreateReportRequest, MyReport, MyReportsQuery } from '@masaha/shared/data-reports';

import type { RunInTransaction } from '../../db/index.ts';
import type { Actor } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { toSkip } from '../../shared/http/index.ts';
import type { LookupsService } from '../lookups/index.ts';
import type { PublicListingService, PublicSpaceService, SpacesService } from '../spaces/index.ts';
import type { UsersService } from '../users/index.ts';
import { toMyReport } from './data-reports.mapper.ts';
import { createDataReportsRepository } from './data-reports.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  spaces: SpacesService;
  publicSpace: PublicSpaceService;
  publicListing: PublicListingService;
  lookups: LookupsService;
  users: UsersService;
  /** The one clock (conventions §11): a report is dated by it. */
  now: () => Date;
}

/**
 * The users' reports of a space's wrong information (docs/backend/conventions.md §7): sent by a
 * signed-in user about a listed space, read by the reporter.
 */
export function createDataReportsService({
  runInTransaction,
  spaces,
  publicSpace,
  publicListing,
  lookups,
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

  return {
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
