import type { Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { createCustomersRepository, type CustomerRow } from './customers.repository.ts';

interface Dependencies {
  audit: AuditWriter;
}

/**
 * A space's customers (docs/backend/conventions.md §7). So far the names the desk shows, and the
 * customer an unpaid visit belongs to, found or created by phone.
 */
export function createCustomersService({ audit }: Dependencies) {
  const repository = createCustomersRepository();
  return {
    /** The names of these customers of the space, by id, in one query. */
    namesOf(spaceId: number, ids: readonly number[], tx?: Tx): Promise<Map<number, string>> {
      return repository.namesOf(spaceId, ids, tx);
    },

    /**
     * The space's customer with this phone among those not archived (data model › Unpaid visit);
     * else a new one with this name, audited `customer.created`. In the caller's transaction, which
     * holds the space's lock, so two desks cannot create the same phone at once.
     */
    async findOrCreateByPhone(
      {
        spaceId,
        phone,
        name,
        actorId,
      }: { spaceId: number; phone: string; name: string; actorId: number },
      tx: Tx,
    ): Promise<CustomerRow> {
      const found = await repository.findByPhone(spaceId, phone, tx);
      if (found) return found;

      const created = await repository.create(spaceId, { name, phone }, tx);
      await audit(
        {
          actorId,
          action: 'customer.created',
          entityType: 'customer',
          entityId: created.id,
          spaceId,
          after: { name, phone },
        },
        tx,
      );
      return created;
    },
  };
}

export type CustomersService = ReturnType<typeof createCustomersService>;
