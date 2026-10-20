import type { CheckInVisitRequest, DeskVisit, Rates } from '@masaha/shared/visits';

import type { Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { ratesFor } from './visitCharge.ts';
import { toDeskVisit } from './visits.mapper.ts';
import { createVisitsRepository, type NewVisit, type OpenVisit } from './visits.repository.ts';

interface Dependencies {
  audit: AuditWriter;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
}

/**
 * A visitor's stay at a space, checked in by name (docs/backend/conventions.md › the front desk):
 * its rates, its check-in, which `desk` orchestrates, and the reads `occupancy` composes *present*
 * from.
 */
export function createVisitsService({ audit, spaces, spaceSettings }: Dependencies) {
  const repository = createVisitsRepository();
  return {
    /** The space's visit created with this idempotency key, or `null`: a retried check-in. */
    async findByKey(spaceId: number, key: string, tx: Tx): Promise<DeskVisit | null> {
      const row = await repository.findByKey(spaceId, key, tx);
      return row && toDeskVisit(row);
    },

    /**
     * The rates a visit copies at its check-in, from the space's prices as they are now (data model
     * › Visit charge). A student visit is refused where the space turns student prices off.
     */
    async ratesAt(
      spaceId: number,
      { audience, shiftId }: Pick<CheckInVisitRequest, 'audience' | 'shiftId'>,
      tx: Tx,
    ): Promise<Rates> {
      if (audience === 'STUDENT' && !(await spaceSettings.read(spaceId, tx)).visitStudentPrices) {
        throw AppError.validation({ audience: ['invalid_choice'] });
      }
      return ratesFor(await spaces.pricesOf(spaceId, tx), { audience, shiftId: shiftId ?? null });
    },

    /**
     * Checks the visit in, in the caller's transaction, audited `visit.checkedIn`. A shift that is
     * not the space's is refused on `shiftId`.
     */
    async create(actorId: number, visit: NewVisit, tx: Tx): Promise<DeskVisit> {
      const row = await repository.create(visit, tx);
      if (!row) throw AppError.validation({ shiftId: ['invalid_choice'] });
      await audit(
        {
          actorId,
          action: 'visit.checkedIn',
          entityType: 'visit',
          entityId: row.id,
          spaceId: visit.spaceId,
          after: {
            visitorName: visit.visitorName,
            audience: visit.audience,
            shiftId: visit.shiftId,
            hourRateAgorot: visit.rates.hourAgorot,
            dayRateAgorot: visit.rates.dayAgorot,
          },
        },
        tx,
      );
      return toDeskVisit(row);
    },

    /** The space's open visits, the earliest checked in first, then by id. */
    openIn(spaceId: number, tx?: Tx): Promise<OpenVisit[]> {
      return repository.openIn(spaceId, tx);
    },

    /** How many visits are open at each of these spaces, in one query; a space with none is absent. */
    openCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      return repository.openCountsIn(spaceIds);
    },
  };
}

export type VisitsService = ReturnType<typeof createVisitsService>;
