import type { DomainErrorCode } from '@masaha/shared/core';
import type { CheckInVisitRequest, DeskVisit } from '@masaha/shared/visits';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import type { VisitsService } from '../visits/index.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  spaces: SpacesService;
  visits: VisitsService;
  occupancy: OccupancyService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

/**
 * The front desk's orchestrations (docs/backend/conventions.md › the front desk): each spans the
 * desk's modules in one transaction, which takes the space's lock first.
 */
export function createDeskService({
  runInTransaction,
  spaces,
  visits,
  occupancy,
  now,
}: Dependencies) {
  /**
   * Opens a desk write: the space's lock, which also serialises the space's desk creates, then
   * `can()` on the links read under it, so a link ended meanwhile still decides (finding 43).
   */
  async function lockAtDesk(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) {
      throw AppError.notFound(undefined, 'Space not found');
    }
    if (!can(actor, 'attendance.record', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  return {
    /**
     * Checks a visitor in, in one transaction: the space's lock and `can()`; the visit this key
     * already made, for a retry; else the visit, with the rates of its audience and shift as they
     * are now. Answers it with what the check-in warns of now (a retry counts the visit present),
     * which never refuses it.
     */
    checkInVisit(
      actor: Actor,
      space: LoadedSpace,
      key: string,
      request: CheckInVisitRequest,
    ): Promise<{ visit: DeskVisit; warnings: DomainErrorCode[] }> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx);
        const checkedInAt = now();
        const warnings = await occupancy.checkInWarnings(space.id, checkedInAt, tx);
        const visit =
          (await visits.findByKey(space.id, key, tx)) ??
          (await visits.create(
            actor.id,
            {
              spaceId: space.id,
              key,
              visitorName: request.visitorName,
              audience: request.audience,
              shiftId: request.shiftId ?? null,
              rates: await visits.ratesAt(space.id, request, tx),
              checkedInAt,
            },
            tx,
          ));
        return { visit, warnings };
      });
    },
  };
}

export type DeskService = ReturnType<typeof createDeskService>;
