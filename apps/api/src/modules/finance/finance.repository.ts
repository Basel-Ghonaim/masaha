import { prisma } from '../../db/index.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import type { HourSlot, Window } from './windows.ts';

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
 * The space's closed stays checked in within `[from, to)` (a `WITH` body): its visits and its
 * subscription check-ins, the auto check-out's included, open ones left out (the owner's decision
 * 7); each with its kind and, a member's, its customer. Bounded by the check-in on the
 * `(space_id, checked_in_at)` indexes: a stay never crosses its check-in's Gaza day.
 */
function closedStaysIn(spaceId: number, from: Date, to: Date) {
  return Prisma.sql`
    SELECT checked_in_at, checked_out_at, NULL::integer AS customer_id, 'VISIT' AS kind
    FROM visits
    WHERE space_id = ${spaceId} AND checked_out_at IS NOT NULL
      AND checked_in_at >= ${from} AND checked_in_at < ${to}
    UNION ALL
    SELECT checked_in_at, checked_out_at, customer_id, 'MEMBER'
    FROM check_ins
    WHERE space_id = ${spaceId} AND checked_out_at IS NOT NULL
      AND checked_in_at >= ${from} AND checked_in_at < ${to}`;
}

/** The windows as two arrays of instants, and the range they span (they come in order). */
function spanOf(windows: readonly Window[]) {
  const first = windows[0];
  const last = windows.at(-1);
  if (!first || !last) throw new Error('No window to read.');
  return {
    froms: windows.map(({ from }) => from.toISOString()),
    tos: windows.map(({ to }) => to.toISOString()),
    from: first.from,
    to: last.to,
  };
}

/**
 * Finance's own reads (a read model, docs/backend/conventions.md › R7): who paid in a month, from
 * the payments and the items they paid; the occupancy statistics, from the closed stays. The ledger's sums over windows and balances are `payments`'.
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

    /**
     * Per Gaza day (each window one day, in order): the closed visits checked in on it, and the
     * members who checked in on it, each once however many times. One statement.
     */
    async perDay(
      spaceId: number,
      days: readonly Window[],
    ): Promise<{ visits: number; members: number }[]> {
      if (days.length === 0) return [];
      const { froms, tos, from, to } = spanOf(days);
      return prisma.$queryRaw<{ visits: number; members: number }[]>`
        WITH stays AS (${closedStaysIn(spaceId, from, to)})
        SELECT count(s.kind) FILTER (WHERE s.kind = 'VISIT')::integer AS visits,
               count(DISTINCT s.customer_id) FILTER (WHERE s.kind = 'MEMBER')::integer AS members
        FROM unnest(${froms}::timestamptz[], ${tos}::timestamptz[]) WITH ORDINALITY AS w(f, t, i)
        LEFT JOIN stays s ON s.checked_in_at >= w.f AND s.checked_in_at < w.t
        GROUP BY w.i ORDER BY w.i`;
    },

    /**
     * Per hour slot, in order: the closed stays overlapping it (checked in before its end and out
     * after its start). The stays read once for the slots' range. One statement.
     */
    async presenceBySlot(spaceId: number, slots: readonly HourSlot[]): Promise<number[]> {
      if (slots.length === 0) return [];
      const { froms, tos, from, to } = spanOf(slots);
      const rows = await prisma.$queryRaw<{ present: number }[]>`
        WITH stays AS (${closedStaysIn(spaceId, from, to)})
        SELECT count(s.kind)::integer AS present
        FROM unnest(${froms}::timestamptz[], ${tos}::timestamptz[]) WITH ORDINALITY AS w(f, t, i)
        LEFT JOIN stays s ON s.checked_in_at < w.t AND s.checked_out_at > w.f
        GROUP BY w.i ORDER BY w.i`;
      return rows.map(({ present }) => present);
    },

    /**
     * The average stay of the closed stays checked in within the window, in whole minutes: all,
     * the members' and the visits' apart; `null` without any. One statement.
     */
    async stayMinutes(
      spaceId: number,
      { from, to }: Window,
    ): Promise<{ all: number | null; members: number | null; visits: number | null }> {
      const minutes = Prisma.sql`extract(epoch FROM checked_out_at - checked_in_at) / 60`;
      const [row] = await prisma.$queryRaw<
        { all: number | null; members: number | null; visits: number | null }[]
      >`
        WITH stays AS (${closedStaysIn(spaceId, from, to)})
        SELECT round(avg(${minutes}))::integer AS "all",
               round(avg(${minutes}) FILTER (WHERE kind = 'MEMBER'))::integer AS members,
               round(avg(${minutes}) FILTER (WHERE kind = 'VISIT'))::integer AS visits
        FROM stays`;
      return row ?? { all: null, members: null, visits: null };
    },
  };
}
