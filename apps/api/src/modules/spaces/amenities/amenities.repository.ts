import { prisma, type Tx } from '../../../db/index.ts';

/** A space's links to the amenities it has. */
export function createSpaceAmenitiesRepository() {
  return {
    /** The ids of the space's amenities, retired ones included, by id. */
    async listFor(spaceId: number, tx: Tx = prisma): Promise<number[]> {
      const rows = await tx.spaceAmenity.findMany({
        where: { spaceId },
        orderBy: { amenityId: 'asc' },
        select: { amenityId: true },
      });
      return rows.map(({ amenityId }) => amenityId);
    },

    /**
     * Makes the space's amenities exactly these: the links left out are removed and the new ones
     * added, one statement at a time (finding 11); a kept link is untouched.
     */
    async replace(
      spaceId: number,
      { remove, add }: { remove: readonly number[]; add: readonly number[] },
      tx: Tx,
    ): Promise<void> {
      if (remove.length > 0) {
        await tx.spaceAmenity.deleteMany({ where: { spaceId, amenityId: { in: [...remove] } } });
      }
      for (const amenityId of add) {
        await tx.spaceAmenity.create({ data: { spaceId, amenityId }, select: { spaceId: true } });
      }
    },
  };
}
