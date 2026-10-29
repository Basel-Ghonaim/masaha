import { prisma } from '../../db/index.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import type { Window } from './windows.ts';

/** A customer who paid in a window: what they paid then, and when they last paid. */
export interface PayerRow {
  customerId: number;
  paidAgorot: number;
  lastPaidAt: Date;
}

/**
 * The space's payments not voided received in the window, each with its item's customer (a
 * visit's, or a subscription's), those that name one: a `FROM … WHERE` both the page and its count
 * read. On `payments (space_id, received_at)`, each item joined by its primary key.
 */
function paidByCustomersIn(spaceId: number, { from, to }: Window) {
  return Prisma.sql`
    FROM payments p
    LEFT JOIN visits v ON v.id = p.visit_id
    LEFT JOIN subscriptions s ON s.id = p.subscription_id
    WHERE p.space_id = ${spaceId} AND p.voided_at IS NULL
      AND p.received_at >= ${from} AND p.received_at < ${to}
      AND coalesce(v.customer_id, s.customer_id) IS NOT NULL`;
}

/**
 * Finance's own reads (a read model, docs/backend/conventions.md › R7): who paid in a month, from
 * the payments and the items they paid. The ledger's sums over windows and balances are `payments`'.
 */
export function createFinanceRepository() {
  return {
    /**
     * A page of the customers who paid the space's items in the window, the payments not voided
     * (a walk-in's payment names no one and is left out): what they paid then and when they last
     * paid, the latest paid first, then by customer id; and how many there are (`count(*) OVER
     * ()`; counted apart only past the last page).
     */
    async payersIn(
      spaceId: number,
      window: Window,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: PayerRow[]; total: number }> {
      const paid = paidByCustomersIn(spaceId, window);
      const rows = await prisma.$queryRaw<
        { customer_id: number; paid: number; last_paid_at: Date; total: number }[]
      >`
        SELECT coalesce(v.customer_id, s.customer_id) AS customer_id,
               sum(p.amount_agorot)::integer AS paid, max(p.received_at) AS last_paid_at,
               count(*) OVER ()::integer AS total
        ${paid}
        GROUP BY 1
        ORDER BY last_paid_at DESC, customer_id
        LIMIT ${take} OFFSET ${skip}`;
      const total =
        rows[0]?.total ??
        (skip === 0
          ? 0
          : ((
              await prisma.$queryRaw<{ total: number }[]>`
                SELECT count(DISTINCT coalesce(v.customer_id, s.customer_id))::integer AS total
                ${paid}`
            )[0]?.total ?? 0));
      return {
        rows: rows.map(({ customer_id, paid: paidAgorot, last_paid_at }) => ({
          customerId: customer_id,
          paidAgorot,
          lastPaidAt: last_paid_at,
        })),
        total,
      };
    },
  };
}
