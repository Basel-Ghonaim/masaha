import { prisma, type Tx } from '../../db/index.ts';

const CUSTOMER = { id: true, name: true, phone: true } as const;

/** A customer as the desk names it. */
export interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
}

/** The `customers` table: a space's customers. So far their names, and one found by phone. */
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

    /** The space's customer with this phone among those not archived, or `null`. */
    findByPhone(spaceId: number, phone: string, tx: Tx): Promise<CustomerRow | null> {
      return tx.customer.findFirst({
        where: { spaceId, phone, archivedAt: null },
        select: CUSTOMER,
      });
    },

    create(spaceId: number, { name, phone }: { name: string; phone: string }, tx: Tx) {
      return tx.customer.create({ data: { spaceId, name, phone }, select: CUSTOMER });
    },
  };
}
