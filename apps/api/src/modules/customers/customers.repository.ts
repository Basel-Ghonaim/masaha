import { prisma, type Tx } from '../../db/index.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import type { SearchTerms } from './customerSearch.ts';

const CUSTOMER = { id: true, name: true, phone: true, archivedAt: true } as const;

/** A customer as the desk names it. */
export interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
  archivedAt: Date | null;
}

/** What a page of the list keeps: archived or not, a search, ids it must be in, ids it must not. */
export interface CustomerFilter {
  archived: boolean;
  search: SearchTerms | null;
  /** Each list a filter resolved to: a customer is kept only when it is in every one. */
  include: readonly (readonly number[])[];
  exclude: readonly number[];
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

    /**
     * A page of the space's customers the filter keeps, by name then id, and how many it keeps.
     * Raw SQL: each id list is one array parameter, read as a set (`IN (SELECT unnest(…))`), so no
     * list, however long, meets PostgreSQL's bound on parameters. A phone is searched by its last
     * digits, a name as the directory searches (`masaha_search_text`, data model › Search).
     */
    async page(
      spaceId: number,
      { archived, search, include, exclude }: CustomerFilter,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: CustomerRow[]; total: number }> {
      const conditions = [
        Prisma.sql`space_id = ${spaceId}`,
        archived ? Prisma.sql`archived_at IS NOT NULL` : Prisma.sql`archived_at IS NULL`,
        ...include.map((ids) => Prisma.sql`id IN (SELECT unnest(${[...ids]}::integer[]))`),
      ];
      if (exclude.length > 0) {
        conditions.push(Prisma.sql`id NOT IN (SELECT unnest(${[...exclude]}::integer[]))`);
      }
      if (search && 'phoneDigits' in search) {
        conditions.push(
          Prisma.sql`regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') LIKE '%' || ${search.phoneDigits}`,
        );
      } else if (search) {
        conditions.push(
          Prisma.sql`strpos(masaha_search_text(name), masaha_search_text(${search.name})) > 0`,
        );
      }
      const where = Prisma.join(conditions, ' AND ');
      const [rows, [count]] = await Promise.all([
        prisma.$queryRaw<
          { id: number; name: string; phone: string | null; archived_at: Date | null }[]
        >`
          SELECT id, name, phone, archived_at FROM customers WHERE ${where}
          ORDER BY name, id LIMIT ${take} OFFSET ${skip}`,
        prisma.$queryRaw<{ total: number }[]>`
          SELECT count(*)::integer AS total FROM customers WHERE ${where}`,
      ]);
      return {
        rows: rows.map(({ id, name, phone, archived_at }) => ({
          id,
          name,
          phone,
          archivedAt: archived_at,
        })),
        total: count?.total ?? 0,
      };
    },

    /** Archives the customer at this time, or restores them with `null`. */
    setArchived(id: number, at: Date | null, tx: Tx): Promise<CustomerRow> {
      return tx.customer.update({ where: { id }, data: { archivedAt: at }, select: CUSTOMER });
    },
  };
}
