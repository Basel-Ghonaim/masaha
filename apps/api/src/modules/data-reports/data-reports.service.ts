import type { CreateReportRequest, MyReport } from '@masaha/shared/data-reports';

import type { RunInTransaction } from '../../db/index.ts';
import type { Actor } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { LookupsService } from '../lookups/index.ts';
import type { PublicSpaceService, SpacesService } from '../spaces/index.ts';
import type { UsersService } from '../users/index.ts';
import { toMyReport } from './data-reports.mapper.ts';
import { createDataReportsRepository } from './data-reports.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  spaces: SpacesService;
  publicSpace: PublicSpaceService;
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
  lookups,
  users,
  now,
}: Dependencies) {
  const repository = createDataReportsRepository();

  return {
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
