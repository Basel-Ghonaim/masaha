import type { AdminArea, CreateAreaRequest, UpdateAreaRequest } from '@masaha/shared/lookups';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { exactOrder } from '../exactOrder.ts';
import { added, lookupChange } from '../lookupChange.ts';
import { toAdminArea } from './areas.mapper.ts';
import { createAreasRepository, type AreaWrite } from './areas.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
}

/** The written area, or 409 with `not_unique` when its Arabic name is another's in its governorate. */
function areaOf(write: AreaWrite) {
  if ('taken' in write) {
    throw AppError.conflict(undefined, 'Area name taken', { [write.taken]: ['not_unique'] });
  }
  return write.area;
}

const governorateNotFound = () => AppError.notFound(undefined, 'Governorate not found');

/**
 * The admin's areas, each in one governorate: added, renamed, hidden and restored, each with its
 * audit entry in the same transaction, and ordered as a whole list per governorate (L3, L4, L7).
 */
export function createAreasService({ runInTransaction, audit }: Dependencies) {
  const repository = createAreasRepository();
  return {
    /** A new area, placed last in its governorate, hidden or not. */
    add(actorId: number, area: CreateAreaRequest): Promise<AdminArea> {
      return runInTransaction(async (tx) => {
        const { governorateId } = area;
        if (!(await repository.lockGovernorate(governorateId, tx))) throw governorateNotFound();
        const sortOrder = await repository.nextPlace(governorateId, tx);
        const created = areaOf(await repository.create({ ...area, sortOrder }, tx));
        await audit({ ...added('area', area), actorId, entityId: created.id }, tx);
        return toAdminArea(created);
      });
    },

    /** Renames, hides or restores it. */
    update(actorId: number, id: number, patch: UpdateAreaRequest): Promise<AdminArea> {
      return runInTransaction(async (tx) => {
        const current = await repository.lock(id, tx);
        if (!current) throw AppError.notFound(undefined, 'Area not found');
        const { data, entries } = lookupChange('area', current, patch);
        if (entries.length === 0) return toAdminArea(current);

        const area = areaOf(await repository.update(id, data, tx));
        for (const entry of entries) await audit({ ...entry, actorId, entityId: id }, tx);
        return toAdminArea(area);
      });
    },

    /** Puts the governorate's areas in the order of `ids`, which must name each exactly once. */
    reorder(governorateId: number, ids: readonly number[]): Promise<void> {
      return runInTransaction(async (tx) => {
        if (!(await repository.lockGovernorate(governorateId, tx))) throw governorateNotFound();
        const places = exactOrder(await repository.lockPlaces(governorateId, tx), ids);
        await repository.setPlaces(places, tx);
      });
    },
  };
}

export type AreasService = ReturnType<typeof createAreasService>;
