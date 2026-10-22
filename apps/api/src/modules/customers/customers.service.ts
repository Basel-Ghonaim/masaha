import type { PaginationQuery } from '@masaha/shared/core';
import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '@masaha/shared/customers';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace, type SpaceAction } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { toSkip } from '../../shared/http/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { customerChange } from './customerChange.ts';
import { searchTermsOf } from './customerSearch.ts';
import { toCustomer } from './customers.mapper.ts';
import { createCustomersRepository, type CustomerRow } from './customers.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

/** A phone another customer of the space holds: refused on its field. */
const phoneTaken = () => AppError.conflict('PHONE_TAKEN', 'Phone taken', { phone: ['not_unique'] });

/**
 * A space's customers (docs/backend/conventions.md §7): created and edited by the space's staff,
 * the names the desk shows, and the customer an unpaid visit belongs to, found or created by phone.
 */
export function createCustomersService({ runInTransaction, audit, spaces, now }: Dependencies) {
  const repository = createCustomersRepository();

  /**
   * Locks the space and decides whether `actor` may change its customers, on its links as they are
   * under the lock: every link change takes that lock, so a link ended meanwhile still decides
   * (finding 43). The lock also serialises the space's customer creates, so a retry is read first.
   */
  async function lockFor(
    actor: Actor,
    space: LoadedSpace,
    tx: Tx,
    action: SpaceAction = 'customers.manage',
  ): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, action, { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  /** Whether another customer of the space, not archived, holds this phone. */
  async function heldByAnother(spaceId: number, phone: string, id: number | null, tx: Tx) {
    const holder = await repository.findByPhone(spaceId, phone, tx);
    return holder !== null && holder.id !== id;
  }

  return {
    /** The names of these customers of the space, by id, in one query. */
    namesOf(spaceId: number, ids: readonly number[], tx?: Tx): Promise<Map<number, string>> {
      return repository.namesOf(spaceId, ids, tx);
    },

    /** These customers of the space, by id, with their names and phones, in one query. */
    contactsOf(
      spaceId: number,
      ids: readonly number[],
      tx?: Tx,
    ): Promise<Map<number, { id: number; name: string; phone: string | null }>> {
      return repository.contactsOf(spaceId, ids, tx);
    },

    /**
     * Creates a customer, in one transaction and in this order: the space's lock; `can()` on the
     * links read under it; the customer this key already made, for a retry, answered as it is now;
     * a phone another customer of the space holds, not archived → `PHONE_TAKEN`; the customer, with
     * the key; its audit entry.
     */
    create(
      actor: Actor,
      space: LoadedSpace,
      key: string,
      { name, phone }: CreateCustomerRequest,
    ): Promise<Customer> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const recorded = await repository.findByKey(space.id, key, tx);
        if (recorded) return toCustomer(recorded);
        if (phone !== undefined && (await heldByAnother(space.id, phone, null, tx))) {
          throw phoneTaken();
        }

        const created = await repository.create(space.id, { name, phone: phone ?? null, key }, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'customer.created',
            entityType: 'customer',
            entityId: created.id,
            spaceId: space.id,
            after: { name, phone: phone ?? null },
          },
          tx,
        );
        return toCustomer(created);
      });
    },

    /**
     * Edits a customer, in one transaction and in this order: the space's lock; `can()` on the links
     * read under it; the customer, the space's (else `not_found`), not archived (else
     * `CUSTOMER_ARCHIVED`); only the fields the edit sets to a new value, `null` clearing the phone;
     * a new phone another customer holds → `PHONE_TAKEN`; its audit entry. An edit that changes
     * nothing writes and audits nothing.
     */
    edit(
      actor: Actor,
      space: LoadedSpace,
      customerId: number,
      request: UpdateCustomerRequest,
    ): Promise<Customer> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const current = await repository.findIn(space.id, customerId, tx);
        if (!current) throw AppError.notFound(undefined, 'Customer not found');
        if (current.archivedAt) throw AppError.conflict('CUSTOMER_ARCHIVED');
        const { data, before, after } = customerChange(current, request);
        if (Object.keys(data).length === 0) return toCustomer(current);
        if (data.phone && (await heldByAnother(space.id, data.phone, customerId, tx))) {
          throw phoneTaken();
        }

        const row = await repository.update(customerId, data, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'customer.edited',
            entityType: 'customer',
            entityId: customerId,
            spaceId: space.id,
            before,
            after,
          },
          tx,
        );
        return toCustomer(row);
      });
    },

    /**
     * A page of the space's customers, archived ones only when asked, searched by `q` (a phone's
     * last digits, or a name), kept to the ids every `include` list holds and none of `exclude`
     * holds, by name then id; and how many there are. Read without a lock.
     */
    async page(
      spaceId: number,
      {
        q,
        archived,
        include,
        exclude,
      }: {
        q: string | undefined;
        archived: boolean;
        include: readonly (readonly number[])[];
        exclude: readonly number[];
      },
      query: PaginationQuery,
    ): Promise<{ rows: Customer[]; total: number }> {
      const { rows, total } = await repository.page(
        spaceId,
        { archived, search: q === undefined ? null : searchTermsOf(q), include, exclude },
        { skip: toSkip(query), take: query.limit },
      );
      return { rows: rows.map(toCustomer), total };
    },

    /** The space's customer with this id, in the caller's transaction when given, or `null`. */
    async findIn(spaceId: number, customerId: number, tx?: Tx): Promise<Customer | null> {
      const row = await repository.findIn(spaceId, customerId, tx);
      return row && toCustomer(row);
    },

    /**
     * Archives the customer now, in the caller's transaction (the desk's, which holds the space's
     * lock and has asked `can()` and whether they are present), audited `customer.archived`.
     */
    async archive(actor: Actor, space: LoadedSpace, customerId: number, tx: Tx): Promise<Customer> {
      const row = await repository.setArchived(customerId, now(), tx);
      await audit(
        {
          actorId: actor.id,
          action: 'customer.archived',
          entityType: 'customer',
          entityId: customerId,
          spaceId: space.id,
          after: { archivedAt: row.archivedAt?.toISOString() ?? null },
        },
        tx,
      );
      return toCustomer(row);
    },

    /**
     * Restores an archived customer, the owner's, in one transaction and in this order: the space's
     * lock; `can()` (`customers.archive`) on the links read under it; the customer, the space's
     * (else `not_found`); one not archived answered as it is; a phone another customer now holds →
     * `PHONE_TAKEN`; audited `customer.restored` with when they were archived.
     */
    restore(actor: Actor, space: LoadedSpace, customerId: number): Promise<Customer> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx, 'customers.archive');
        const current = await repository.findIn(space.id, customerId, tx);
        if (!current) throw AppError.notFound(undefined, 'Customer not found');
        const { archivedAt } = current;
        if (!archivedAt) return toCustomer(current);
        if (current.phone && (await heldByAnother(space.id, current.phone, customerId, tx))) {
          throw phoneTaken();
        }

        const row = await repository.setArchived(customerId, null, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'customer.restored',
            entityType: 'customer',
            entityId: customerId,
            spaceId: space.id,
            before: { archivedAt: archivedAt.toISOString() },
          },
          tx,
        );
        return toCustomer(row);
      });
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
