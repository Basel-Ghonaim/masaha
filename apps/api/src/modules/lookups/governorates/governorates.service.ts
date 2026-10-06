import type {
  AdminGovernorate,
  AdminGovernorateWithAreas,
  CreateGovernorateRequest,
  UpdateGovernorateRequest,
} from '@masaha/shared/lookups';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { exactOrder } from '../exactOrder.ts';
import { added, lookupChange } from '../lookupChange.ts';
import { toAdminGovernorate, toAdminGovernorateWithAreas } from './governorates.mapper.ts';
import { createGovernoratesRepository, type GovernorateWrite } from './governorates.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
}

/** The written governorate, or 409 with `not_unique` when its Arabic name is another's (L5). */
function governorateOf(write: GovernorateWrite) {
  if ('taken' in write) {
    throw AppError.conflict(undefined, 'Governorate name taken', { [write.taken]: ['not_unique'] });
  }
  return write.governorate;
}

/**
 * The admin's governorates: added, renamed, hidden and restored, each with its audit entry in the
 * same transaction, and ordered as a whole list (decisions L3, L4, L7).
 */
export function createGovernoratesService({ runInTransaction, audit }: Dependencies) {
  const repository = createGovernoratesRepository();
  return {
    async list(): Promise<AdminGovernorateWithAreas[]> {
      return (await repository.findAllWithAreas()).map(toAdminGovernorateWithAreas);
    },

    /** A new governorate, placed last. */
    add(actorId: number, names: CreateGovernorateRequest): Promise<AdminGovernorate> {
      return runInTransaction(async (tx) => {
        const sortOrder = await repository.nextPlace(tx);
        const governorate = governorateOf(await repository.create({ ...names, sortOrder }, tx));
        await audit({ ...added('governorate', names), actorId, entityId: governorate.id }, tx);
        return toAdminGovernorate(governorate);
      });
    },

    /** Renames, hides or restores it; its areas' own flags are untouched. */
    update(
      actorId: number,
      id: number,
      patch: UpdateGovernorateRequest,
    ): Promise<AdminGovernorate> {
      return runInTransaction(async (tx) => {
        const current = await repository.lock(id, tx);
        if (!current) throw AppError.notFound(undefined, 'Governorate not found');
        const { data, entries } = lookupChange('governorate', current, patch);
        if (entries.length === 0) return toAdminGovernorate(current);

        const governorate = governorateOf(await repository.update(id, data, tx));
        for (const entry of entries) await audit({ ...entry, actorId, entityId: id }, tx);
        return toAdminGovernorate(governorate);
      });
    },

    /** Puts every governorate in the order of `ids`, which must name each exactly once. */
    reorder(ids: readonly number[]): Promise<void> {
      return runInTransaction(async (tx) => {
        await repository.setPlaces(exactOrder(await repository.lockPlaces(tx), ids), tx);
      });
    },
  };
}

export type GovernoratesService = ReturnType<typeof createGovernoratesService>;
