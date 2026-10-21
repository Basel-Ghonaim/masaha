import { prisma, type Tx } from '../../db/index.ts';

/** A subscription check-in still open: whose, on which subscription, and since when. */
export interface OpenCheckIn {
  id: number;
  customerId: number;
  subscriptionId: number;
  checkedInAt: Date;
}

/** An open check-in as the auto check-out reads it: its space and its check-in. */
export interface OpenAttendance {
  id: number;
  spaceId: number;
  checkedInAt: Date;
}

/** The calendar days a read counts attendance by: today and its week's Saturday, Gaza dates. */
export interface Now {
  today: string;
  weekStart: string;
}

/** A subscription's row, with its attendance and amount due from `subscription_usage`. */
export interface SubscriptionStateRow {
  id: number;
  customer_id: number;
  package_id: number | null;
  name: string;
  starts_on: Date | null;
  ends_on: Date | null;
  total_days: number | null;
  days_per_week: number | null;
  hours_per_day: number | null;
  total_hours: number | null;
  billing: 'FIXED' | 'PER_HOUR' | 'PER_DAY';
  price_agorot: number;
  audience: 'GENERAL' | 'STUDENT';
  shift_id: number | null;
  ended_at: Date | null;
  ended_by_id: number | null;
  days_used: number;
  days_this_week: number;
  minutes_used: number;
  minutes_today: number;
  due_agorot: number;
}

/** Each space's count of rows, by space; a space with none is absent. */
function countsBySpace(groups: readonly { spaceId: number; _count: { _all: number } }[]) {
  return new Map(groups.map(({ spaceId, _count }) => [spaceId, _count._all]));
}

/**
 * The `subscriptions` and `check_ins` tables (docs/backend/conventions.md › the front desk). So far
 * the subscriptions' states, the check-ins' open rows and their auto check-out.
 */
export function createSubscriptionsRepository() {
  return {
    /** The space's open check-ins, the earliest first, then by id. */
    openCheckInsIn(spaceId: number, tx: Tx = prisma): Promise<OpenCheckIn[]> {
      return tx.checkIn.findMany({
        where: { spaceId, checkedOutAt: null },
        select: { id: true, customerId: true, subscriptionId: true, checkedInAt: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** Every open check-in, of every space, the earliest first, then by id. */
    openEverywhere(): Promise<OpenAttendance[]> {
      return prisma.checkIn.findMany({
        where: { checkedOutAt: null },
        select: { id: true, spaceId: true, checkedInAt: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** Locks the check-in's row (`FOR UPDATE`) while it is still open: whether it was. */
    async lockOpen(checkInId: number, tx: Tx): Promise<boolean> {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM check_ins WHERE id = ${checkInId} AND checked_out_at IS NULL FOR UPDATE`;
      return locked.length > 0;
    },

    /** Closes the check-in by the auto check-out, at its due time. */
    async closeAuto(checkInId: number, checkedOutAt: Date, tx: Tx): Promise<void> {
      await tx.checkIn.update({
        where: { id: checkInId },
        data: { checkedOutAt, checkoutMethod: 'AUTO' },
        select: { id: true },
      });
    },

    /**
     * The space's subscriptions — of one customer, of these customers, or with these ids, when
     * given — each with its attendance and amount due as `subscription_usage` counts them on these
     * days: one query, each id list one array parameter. The latest started first (none last), then
     * the highest id.
     */
    statesIn(
      spaceId: number,
      {
        customerId = null,
        customerIds = null,
        ids = null,
      }: {
        customerId?: number | null;
        customerIds?: readonly number[] | null;
        ids?: readonly number[] | null;
      },
      { today, weekStart }: Now,
      tx: Tx = prisma,
    ): Promise<SubscriptionStateRow[]> {
      return tx.$queryRaw<SubscriptionStateRow[]>`
        SELECT s.id, s.customer_id, s.package_id, s.name, s.starts_on, s.ends_on,
               s.total_days, s.days_per_week, s.hours_per_day, s.total_hours,
               s.billing::text AS billing, s.price_agorot, s.audience::text AS audience, s.shift_id,
               s.ended_at, s.ended_by_id,
               u.days_used, u.days_this_week, u.minutes_used, u.minutes_today, u.due_agorot
        FROM subscription_usage(${spaceId}, ${customerId}::integer, ${today}::date, ${weekStart}::date) u
        JOIN subscriptions s ON s.id = u.subscription_id
        WHERE (${ids === null}::boolean OR s.id = ANY(${ids ?? []}::integer[]))
          AND (${customerIds === null}::boolean OR s.customer_id = ANY(${customerIds ?? []}::integer[]))
        ORDER BY s.starts_on DESC NULLS LAST, s.id DESC`;
    },

    /** How many check-ins are open at each of these spaces, in one query; none is absent. */
    async openCheckInCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      if (spaceIds.length === 0) return new Map();
      const groups = await prisma.checkIn.groupBy({
        by: ['spaceId'],
        where: { spaceId: { in: [...spaceIds] }, checkedOutAt: null },
        _count: { _all: true },
      });
      return countsBySpace(groups);
    },
  };
}
