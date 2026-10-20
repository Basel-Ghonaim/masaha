import { prisma, type Tx } from '../../db/index.ts';

/** The `customers` table: a space's customers. So far their names. */
export function createCustomersRepository() {
  return {
    /** The names of these customers of the space, by id; another space's are not read. */
    async namesOf(
      spaceId: number,
      ids: readonly number[],
      tx: Tx = prisma,
    ): Promise<Map<number, string>> {
      if (ids.length === 0) return new Map();
      const rows = await tx.customer.findMany({
        where: { spaceId, id: { in: [...ids] } },
        select: { id: true, name: true },
      });
      return new Map(rows.map(({ id, name }) => [id, name]));
    },
  };
}
