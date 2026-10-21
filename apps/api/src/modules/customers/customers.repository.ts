import { prisma, type Tx } from '../../db/index.ts';

const CUSTOMER = { id: true, name: true, phone: true, archivedAt: true } as const;

/** A customer as the desk names it. */
export interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
  archivedAt: Date | null;
}

/** The fields an edit may change. */
export interface CustomerData {
  name?: string;
  phone?: string | null;
}

/**
 * The `customers` table: a space's customers. Their names, one found by phone, by key or by id, and
 * their creation and edits.
 */
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

    /** The space's customer created with this idempotency key, or `null`. */
    findByKey(spaceId: number, key: string, tx: Tx): Promise<CustomerRow | null> {
      return tx.customer.findUnique({
        where: { spaceId_idempotencyKey: { spaceId, idempotencyKey: key } },
        select: CUSTOMER,
      });
    },

    /** The space's customer with this id, or `null`: another space's is not read. */
    findIn(spaceId: number, id: number, tx: Tx = prisma): Promise<CustomerRow | null> {
      return tx.customer.findUnique({
        where: { id_spaceId: { id, spaceId } },
        select: CUSTOMER,
      });
    },

    /** Creates the customer, with the key of the request that creates it, when it has its own. */
    create(
      spaceId: number,
      { name, phone, key }: { name: string; phone: string | null; key?: string },
      tx: Tx,
    ): Promise<CustomerRow> {
      return tx.customer.create({
        data: { spaceId, name, phone, idempotencyKey: key ?? null },
        select: CUSTOMER,
      });
    },

    /** Changes these fields of the customer. */
    update(id: number, data: CustomerData, tx: Tx): Promise<CustomerRow> {
      return tx.customer.update({ where: { id }, data, select: CUSTOMER });
    },

    /** Archives the customer at this time, or restores them with `null`. */
    setArchived(id: number, at: Date | null, tx: Tx): Promise<CustomerRow> {
      return tx.customer.update({ where: { id }, data: { archivedAt: at }, select: CUSTOMER });
    },
  };
}
