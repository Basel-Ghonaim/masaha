import type {
  CustomerBalance,
  PaymentRequest,
  PaymentsQuery,
  PaymentTotals,
} from '@masaha/shared/payments';

import { prisma, type Tx } from '../../db/index.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import type { Now } from '../subscriptions/index.ts';

const VISIT_PAYMENT = {
  id: true,
  visitId: true,
  subscriptionId: true,
  amountAgorot: true,
  method: true,
  note: true,
  receivedAt: true,
  recordedById: true,
} as const;

const ITEM_PAYMENT = {
  ...VISIT_PAYMENT,
  voidedAt: true,
  voidedById: true,
  voidReason: true,
} as const;

/** A payment of an item, as it is stored: its visit or its subscription, the other `null`. */
export interface VisitPaymentRow {
  id: number;
  visitId: number | null;
  subscriptionId: number | null;
  amountAgorot: number;
  method: PaymentRequest['method'];
  note: string | null;
  receivedAt: Date;
  recordedById: number;
}

/** A payment as a statement reads it: its void too. */
export interface ItemPaymentRow extends VisitPaymentRow {
  voidedAt: Date | null;
  voidedById: number | null;
  voidReason: string | null;
}

/** A payment to record on one item, a visit or a subscription, with its idempotency key. */
export interface NewPayment extends PaymentRequest {
  spaceId: number;
  item: { visitId: number } | { subscriptionId: number };
  key: string;
  recordedById: number;
  receivedAt: Date;
}

/**
 * The payments list's filter, its void aside: the space's payments received in a window of instants
 * (`to` left out), by whom, by which method, and on which kind of item, each when given.
 */
export interface PaymentsFilter {
  spaceId: number;
  from: Date;
  to: Date;
  recordedById?: number;
  method?: PaymentRequest['method'];
  kind?: PaymentsQuery['kind'];
}

/** The `where` of the payments list's filter, and of its void filter when given. */
function paymentsWhere(
  { spaceId, from, to, recordedById, method, kind }: PaymentsFilter,
  voided: PaymentsQuery['voided'] = 'INCLUDE',
): Prisma.PaymentWhereInput {
  return {
    spaceId,
    receivedAt: { gte: from, lt: to },
    ...(recordedById !== undefined && { recordedById }),
    ...(method !== undefined && { method }),
    ...(kind === 'VISIT' && { visitId: { not: null } }),
    ...(kind === 'SUBSCRIPTION' && { subscriptionId: { not: null } }),
    ...(voided === 'EXCLUDE' && { voidedAt: null }),
    ...(voided === 'ONLY' && { voidedAt: { not: null } }),
  };
}

/** One item a customer may owe on: a subscription or a closed visit, with its due and what was paid. */
export interface ItemBalanceRow {
  kind: 'VISIT' | 'SUBSCRIPTION';
  id: number;
  /** `null` for a visit with no charge (unpriced), which owes nothing until priced. */
  dueAgorot: number | null;
  paidAgorot: number;
  createdAt: Date;
}

/**
 * The items of a space a customer may owe on, each with its due and what was paid on it, voided
 * payments left out (data model › Balance, Customer debt): its subscriptions, their due from their
 * owner's function `subscription_usage`; its closed visits with a customer, not written off. Of the
 * customers asked when given (one array parameter per branch; on the visits read as a set), else of
 * every customer of the space. One statement: the owner's decision 6 puts every debt in the database.
 *
 * Each item sums its own payments (`LEFT JOIN LATERAL`, on the payments' `visit_id` and
 * `subscription_id` indexes), so a read costs what it asks for: an aggregate of every payment of the
 * space joined back by an `OR` of two columns can only be a nested loop of items × paid items
 * (#102's review, finding 1). On the subscriptions the customers' filter is `= ANY(…)`, which
 * PostgreSQL pushes inside the function it inlines, so only their subscriptions are counted (a
 * semi-join on `unnest` is not pushed there); the list is a page's or one customer's.
 */
function balancesOf(
  spaceId: number,
  customerIds: readonly number[] | null,
  { today, weekStart }: Now,
) {
  const asked = customerIds && Prisma.sql`(SELECT unnest(${[...customerIds]}::integer[]))`;
  return Prisma.sql`
    SELECT 'SUBSCRIPTION' AS kind, u.subscription_id AS id, u.customer_id, u.due_agorot AS due,
           u.usage_based, s.created_at, coalesce(p.paid, 0) AS paid
    FROM subscription_usage(${spaceId}, NULL::integer, ${today}::date, ${weekStart}::date) u
    JOIN subscriptions s ON s.id = u.subscription_id
    LEFT JOIN LATERAL (
      SELECT sum(amount_agorot)::integer AS paid FROM payments
      WHERE subscription_id = u.subscription_id AND voided_at IS NULL
    ) p ON true
    ${customerIds ? Prisma.sql`WHERE u.customer_id = ANY(${[...customerIds]}::integer[])` : Prisma.empty}
    UNION ALL
    SELECT 'VISIT', v.id, v.customer_id, v.charge_agorot, false, v.created_at, coalesce(p.paid, 0)
    FROM visits v
    LEFT JOIN LATERAL (
      SELECT sum(amount_agorot)::integer AS paid FROM payments
      WHERE visit_id = v.id AND voided_at IS NULL
    ) p ON true
    WHERE v.space_id = ${spaceId} AND v.customer_id IS NOT NULL AND v.checked_out_at IS NOT NULL
      AND v.written_off_at IS NULL
      ${asked ? Prisma.sql`AND v.customer_id IN ${asked}` : Prisma.empty}`;
}

/**
 * Per customer: the debt, the sum of the positive balances (due − paid), an unpriced visit none; and
 * the credit, the sum of what was paid above the due, a usage-based subscription's only.
 */
const DEBT = Prisma.sql`coalesce(sum(greatest(due - paid, 0)), 0)::integer`;
const CREDIT = Prisma.sql`coalesce(sum(greatest(paid - due, 0)) FILTER (WHERE usage_based), 0)::integer`;

/**
 * The `payments` table, the ledger of ADR 0010. The database owns its rules (append-only, voided
 * once, never above the amount due); a violation reaches the error handler, which translates it.
 */
export function createPaymentsRepository() {
  return {
    /** The space's payment recorded with this idempotency key, or `null`. */
    findByKey(spaceId: number, key: string, tx: Tx): Promise<VisitPaymentRow | null> {
      return tx.payment.findUnique({
        where: { spaceId_idempotencyKey: { spaceId, idempotencyKey: key } },
        select: VISIT_PAYMENT,
      });
    },

    /** The space's payments recorded with these idempotency keys, each with its key; one query. */
    findByKeys(
      spaceId: number,
      keys: readonly string[],
      tx: Tx,
    ): Promise<(VisitPaymentRow & { idempotencyKey: string })[]> {
      return tx.payment.findMany({
        where: { spaceId, idempotencyKey: { in: [...keys] } },
        select: { ...VISIT_PAYMENT, idempotencyKey: true },
      });
    },

    /** What was paid on each of these visits of the space, voided payments left out; none is absent. */
    async paidFor(
      spaceId: number,
      visitIds: readonly number[],
      tx: Tx = prisma,
    ): Promise<Map<number, number>> {
      if (visitIds.length === 0) return new Map();
      const groups = await tx.payment.groupBy({
        by: ['visitId'],
        where: { spaceId, visitId: { in: [...visitIds] }, voidedAt: null },
        _sum: { amountAgorot: true },
      });
      return new Map(
        groups.flatMap(({ visitId, _sum }) =>
          visitId === null ? [] : [[visitId, _sum.amountAgorot ?? 0] as const],
        ),
      );
    },

    /**
     * The debt and the credit of each of these customers of the space, on these days; a customer with
     * nothing to owe on is answered settled. One query, the ids one array parameter.
     */
    async customerBalances(
      spaceId: number,
      customerIds: readonly number[],
      now: Now,
      tx: Tx = prisma,
    ): Promise<Map<number, CustomerBalance>> {
      if (customerIds.length === 0) return new Map();
      const rows = await tx.$queryRaw<{ customer_id: number; debt: number; credit: number }[]>`
        WITH balances AS (${balancesOf(spaceId, customerIds, now)})
        SELECT customer_id, ${DEBT} AS debt, ${CREDIT} AS credit
        FROM balances GROUP BY customer_id`;
      const found = new Map(
        rows.map(({ customer_id, debt, credit }) => [customer_id, { debt, credit }]),
      );
      return new Map(
        customerIds.map((id) => {
          const { debt = 0, credit = 0 } = found.get(id) ?? {};
          return [id, { debtAgorot: debt, creditAgorot: credit }];
        }),
      );
    },

    /** The ids of the space's customers who owe, or who are in credit, on these days, in id order. */
    async customerIdsByPayment(
      spaceId: number,
      state: 'OWES' | 'CREDIT',
      now: Now,
    ): Promise<number[]> {
      const total = state === 'OWES' ? DEBT : CREDIT;
      const rows = await prisma.$queryRaw<{ customer_id: number }[]>`
        WITH balances AS (${balancesOf(spaceId, null, now)})
        SELECT customer_id FROM balances
        GROUP BY customer_id HAVING ${total} > 0
        ORDER BY customer_id`;
      return rows.map(({ customer_id }) => customer_id);
    },

    /**
     * Every item of one customer of the space, with its due and what was paid, on these days: the
     * oldest first, a visit before a subscription made at the same instant, then by id (the order
     * the payments of an allocation take them in, conventions §13).
     */
    async itemBalances(
      spaceId: number,
      customerId: number,
      now: Now,
      tx: Tx = prisma,
    ): Promise<ItemBalanceRow[]> {
      const rows = await tx.$queryRaw<
        {
          kind: ItemBalanceRow['kind'];
          id: number;
          due: number | null;
          paid: number;
          created_at: Date;
        }[]
      >`
        WITH balances AS (${balancesOf(spaceId, [customerId], now)})
        SELECT kind, id, due, paid, created_at FROM balances
        ORDER BY created_at, kind <> 'VISIT', id`;
      return rows.map(({ kind, id, due, paid, created_at }) => ({
        kind,
        id,
        dueAgorot: due,
        paidAgorot: paid,
        createdAt: created_at,
      }));
    },

    /** Every payment of the space's subscription, voided ones too, the earliest received first. */
    paymentsOfSubscription(
      spaceId: number,
      subscriptionId: number,
      tx: Tx = prisma,
    ): Promise<ItemPaymentRow[]> {
      return tx.payment.findMany({
        where: { spaceId, subscriptionId },
        select: ITEM_PAYMENT,
        orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** Every payment of these visits of the space, voided ones too, the earliest received first. */
    paymentsOfVisits(
      spaceId: number,
      visitIds: readonly number[],
      tx: Tx = prisma,
    ): Promise<ItemPaymentRow[]> {
      if (visitIds.length === 0) return Promise.resolve([]);
      return tx.payment.findMany({
        where: { spaceId, visitId: { in: [...visitIds] } },
        select: ITEM_PAYMENT,
        orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
      });
    },

    /**
     * A page of the space's uncollected visits (data model › Uncollected visits): closed by the auto
     * check-out, or closed by hand, priced, with no customer (only a void leaves one owing), not
     * written off, not settled (balance > 0, or no charge yet), the latest closed first, then by id;
     * each with what was paid, voided payments left out; and how many there are.
     * One query and its count, so a read costs what its page holds (finding 113).
     */
    async uncollectedPage(
      spaceId: number,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: { id: number; paidAgorot: number }[]; total: number }> {
      const uncollected = Prisma.sql`
        FROM visits v
        LEFT JOIN (
          SELECT visit_id, sum(amount_agorot)::integer AS paid FROM payments
          WHERE space_id = ${spaceId} AND visit_id IS NOT NULL AND voided_at IS NULL
          GROUP BY visit_id
        ) p ON p.visit_id = v.id
        WHERE v.space_id = ${spaceId} AND v.checked_out_at IS NOT NULL
          AND (v.checkout_method = 'AUTO' OR (v.customer_id IS NULL AND v.charge_agorot IS NOT NULL))
          AND v.written_off_at IS NULL
          AND (v.charge_agorot IS NULL OR v.charge_agorot - coalesce(p.paid, 0) > 0)`;
      const [rows, [count]] = await Promise.all([
        prisma.$queryRaw<{ id: number; paid: number }[]>`
          SELECT v.id, coalesce(p.paid, 0)::integer AS paid ${uncollected}
          ORDER BY v.checked_out_at DESC, v.id DESC LIMIT ${take} OFFSET ${skip}`,
        prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::integer AS total ${uncollected}`,
      ]);
      return {
        rows: rows.map(({ id, paid }) => ({ id, paidAgorot: paid })),
        total: count?.total ?? 0,
      };
    },

    /**
     * The space's payment, its row locked (`FOR UPDATE`) in the caller's transaction, voided or not;
     * `null` when the space has none with this id.
     */
    async lockIn(spaceId: number, id: number, tx: Tx): Promise<ItemPaymentRow | null> {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM payments WHERE id = ${id} AND space_id = ${spaceId} FOR UPDATE`;
      if (locked.length === 0) return null;
      return tx.payment.findUniqueOrThrow({ where: { id }, select: ITEM_PAYMENT });
    },

    /** Voids the payment: its void's three columns, and nothing else (the change trigger's rule). */
    void(
      id: number,
      { at, byId, reason }: { at: Date; byId: number; reason: string },
      tx: Tx,
    ): Promise<ItemPaymentRow> {
      return tx.payment.update({
        where: { id },
        data: { voidedAt: at, voidedById: byId, voidReason: reason },
        select: ITEM_PAYMENT,
      });
    },

    /**
     * A page of the payments list: the filter's payments, its void filter applied, the latest
     * received first, then by id; on `payments_space_id_received_at_idx`.
     */
    page(
      filter: PaymentsFilter,
      voided: PaymentsQuery['voided'],
      { skip, take }: { skip: number; take: number },
    ): Promise<ItemPaymentRow[]> {
      return prisma.payment.findMany({
        where: paymentsWhere(filter, voided),
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: ITEM_PAYMENT,
      });
    },

    /** How many payments the filter and its void filter hold. */
    count(filter: PaymentsFilter, voided: PaymentsQuery['voided']): Promise<number> {
      return prisma.payment.count({ where: paymentsWhere(filter, voided) });
    },

    /**
     * The filter's totals, its void filter aside: the payments not voided, summed by method and
     * counted; the voided ones counted and summed apart. Two statements, in parallel.
     */
    async totals(filter: PaymentsFilter): Promise<PaymentTotals> {
      const where = paymentsWhere(filter);
      const [byMethod, voided] = await Promise.all([
        prisma.payment.groupBy({
          by: ['method'],
          where: { ...where, voidedAt: null },
          _sum: { amountAgorot: true },
          _count: { _all: true },
        }),
        prisma.payment.aggregate({
          where: { ...where, voidedAt: { not: null } },
          _sum: { amountAgorot: true },
          _count: { _all: true },
        }),
      ]);
      const sums = { CASH: 0, TRANSFER: 0 };
      let count = 0;
      for (const group of byMethod) {
        sums[group.method] = group._sum.amountAgorot ?? 0;
        count += group._count._all;
      }
      return {
        count,
        receivedAgorot: sums.CASH + sums.TRANSFER,
        byMethod: sums,
        voided: { count: voided._count._all, amountAgorot: voided._sum.amountAgorot ?? 0 },
      };
    },

    /** Inserts the payment; the insert trigger checks it against its item's due. */
    create(payment: NewPayment, tx: Tx): Promise<VisitPaymentRow> {
      const { spaceId, item, key, amountAgorot, method, note, recordedById, receivedAt } = payment;
      return tx.payment.create({
        data: {
          spaceId,
          ...item,
          idempotencyKey: key,
          amountAgorot,
          method,
          note: note ?? null,
          recordedById,
          receivedAt,
        },
        select: VISIT_PAYMENT,
      });
    },
  };
}
