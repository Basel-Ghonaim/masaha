import type {
  AdminAmenity,
  CreateAmenityRequest,
  UpdateAmenityRequest,
} from '@masaha/shared/lookups';

import type { RunInTransaction } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { exactOrder } from '../exactOrder.ts';
import { added, lookupChange } from '../lookupChange.ts';
import { toAdminAmenity } from './amenities.mapper.ts';
import { createAmenitiesRepository } from './amenities.repository.ts';
import { amenityKey } from './amenityKey.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
}

/**
 * The admin's amenities: added with a key derived from the English name, edited, retired and
 * restored, each with its audit entry in the same transaction, and ordered as a whole list (L3, L4,
 * L6, L7). A retired amenity keeps its links to spaces.
 */
export function createAmenitiesService({ runInTransaction, audit }: Dependencies) {
  const repository = createAmenitiesRepository();
  return {
    async list(): Promise<AdminAmenity[]> {
      return (await repository.findAll()).map(toAdminAmenity);
    },

    /**
     * A new amenity, placed last. Its key comes from the English name: a name that yields none is
     * `invalid_format`, and a key another amenity holds, a retired one's included, is `not_unique`,
     * both on `nameEn`.
     */
    async add(actorId: number, amenity: CreateAmenityRequest): Promise<AdminAmenity> {
      const key = amenityKey(amenity.nameEn);
      if (!key) throw AppError.validation({ nameEn: ['invalid_format'] });

      return runInTransaction(async (tx) => {
        const sortOrder = await repository.nextPlace(tx);
        const created = await repository.create({ ...amenity, key, sortOrder }, tx);
        if ('taken' in created) {
          throw AppError.conflict(undefined, 'Amenity key taken', { nameEn: ['not_unique'] });
        }
        const { id } = created.amenity;
        await audit({ ...added('amenity', { key, ...amenity }), actorId, entityId: id }, tx);
        return toAdminAmenity(created.amenity);
      });
    },

    /** Edits, retires or restores it. Its key never changes, whatever its new English name. */
    update(actorId: number, id: number, patch: UpdateAmenityRequest): Promise<AdminAmenity> {
      return runInTransaction(async (tx) => {
        const current = await repository.lock(id, tx);
        if (!current) throw AppError.notFound(undefined, 'Amenity not found');
        const { data, entries } = lookupChange('amenity', current, patch);
        if (entries.length === 0) return toAdminAmenity(current);

        const amenity = await repository.update(id, data, tx);
        for (const entry of entries) await audit({ ...entry, actorId, entityId: id }, tx);
        return toAdminAmenity(amenity);
      });
    },

    /** Puts every amenity in the order of `ids`, which must name each exactly once. */
    reorder(ids: readonly number[]): Promise<void> {
      return runInTransaction(async (tx) => {
        await repository.setPlaces(exactOrder(await repository.lockPlaces(tx), ids), tx);
      });
    },
  };
}

export type AmenitiesService = ReturnType<typeof createAmenitiesService>;
