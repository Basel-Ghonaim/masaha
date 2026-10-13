import { prisma, type Tx } from '../../../db/index.ts';

/** A photo as its row holds it: its id and its one storage key. */
export interface PhotoRow {
  id: number;
  key: string;
}

/** A space's photos, in their order: `sort_order` from 0, the first the cover. */
export function createPhotosRepository() {
  return {
    /** In their order. */
    async listFor(spaceId: number, tx: Tx = prisma): Promise<PhotoRow[]> {
      const rows = await tx.spacePhoto.findMany({
        where: { spaceId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, path: true },
      });
      return rows.map(({ id, path }) => ({ id, key: path }));
    },

    /** The key of each space's cover, its first photo, for a set of spaces: one query. */
    async coverKeysFor(spaceIds: readonly number[]): Promise<Map<number, string>> {
      const rows = await prisma.$queryRaw<{ space_id: number; path: string }[]>`
        SELECT DISTINCT ON (space_id) space_id, path FROM space_photos
        WHERE space_id = ANY(${[...spaceIds]}::int[])
        ORDER BY space_id, sort_order, id`;
      return new Map(rows.map((row) => [row.space_id, row.path]));
    },

    count(spaceId: number, tx: Tx = prisma): Promise<number> {
      return tx.spacePhoto.count({ where: { spaceId } });
    },

    /** A new photo at `sortOrder`. */
    async create(spaceId: number, key: string, sortOrder: number, tx: Tx): Promise<PhotoRow> {
      const { id } = await tx.spacePhoto.create({
        data: { spaceId, path: key, sortOrder },
        select: { id: true },
      });
      return { id, key };
    },

    /** Deletes the photo, then closes up the order after it: one statement each. */
    async remove(spaceId: number, id: number, tx: Tx): Promise<void> {
      const { sortOrder } = await tx.spacePhoto.delete({
        where: { id },
        select: { sortOrder: true },
      });
      await tx.$executeRaw`
        UPDATE space_photos SET sort_order = sort_order - 1
        WHERE space_id = ${spaceId} AND sort_order > ${sortOrder}`;
    },

    /** Gives each photo its place in `ids`, one statement at a time (finding 11). */
    async setOrder(ids: readonly number[], tx: Tx): Promise<void> {
      for (const [sortOrder, id] of ids.entries()) {
        await tx.spacePhoto.update({ where: { id }, data: { sortOrder }, select: { id: true } });
      }
    },
  };
}
