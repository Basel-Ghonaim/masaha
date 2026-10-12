import type { OwnAmenity } from '@masaha/shared/spaces';

import { prisma, type Tx } from '../../../db/index.ts';

/** A space's own amenities, beyond the platform's list. */
export function createOwnAmenitiesRepository() {
  return {
    /** In the order they are shown in. */
    listFor(spaceId: number, tx: Tx = prisma): Promise<OwnAmenity[]> {
      return tx.spaceOwnAmenity.findMany({
        where: { spaceId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { nameAr: true, nameEn: true },
      });
    },

    /**
     * Replaces them, in their order, one statement at a time (finding 11). Nothing refers to one,
     * so they are written anew.
     */
    async replace(spaceId: number, ownAmenities: readonly OwnAmenity[], tx: Tx): Promise<void> {
      await tx.spaceOwnAmenity.deleteMany({ where: { spaceId } });
      for (const [sortOrder, { nameAr, nameEn }] of ownAmenities.entries()) {
        await tx.spaceOwnAmenity.create({
          data: { spaceId, nameAr, nameEn, sortOrder },
          select: { id: true },
        });
      }
    },
  };
}
