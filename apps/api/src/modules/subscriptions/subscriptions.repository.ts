import { isForeignKeyViolation, prisma, type Tx } from '../../db/index.ts';
import type { CorrectableTerms } from './subscriptionChange.ts';

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
  renewal_of_id: number | null;
  price_set_by_id: number | null;
  price_reason: string | null;
  ended_at: Date | null;
  ended_by_id: number | null;
  days_used: number;
  days_this_week: number;
  minutes_used: number;
  minutes_today: number;
  due_agorot: number;
}

/** A subscription to write: its customer, its terms and dates (Gaza dates), and its key. */
export interface SubscriptionToCreate {
  spaceId: number;
  customerId: number;
  key: string;
  packageId: number | null;
  renewalOfId: number | null;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  totalDays: number | null;
  daysPerWeek: number | null;
  hoursPerDay: number | null;
  totalHours: number | null;
  billing: 'FIXED' | 'PER_HOUR' | 'PER_DAY';
  priceAgorot: number;
  audience: 'GENERAL' | 'STUDENT';
  shiftId: number | null;
  /** Who typed the price at the desk, and why; `null` when it came from a package. */
  priceTyped: { byId: number; reason: string } | null;
}

/** A check-in of a subscription, as a statement shows it. */
export interface SubscriptionCheckIn {
  id: number;
  checkedInAt: Date;
  checkedOutAt: Date | null;
  checkoutMethod: 'MANUAL' | 'AUTO' | null;
}

/** A subscription's row as its lock answers it. */
export interface LockedSubscription {
  id: number;
  customerId: number;
  /** The subscription that renewed it; `null` while none has. */
  renewedById: number | null;
}

/** A Gaza calendar date as a `@db.Date` value: its UTC midnight (conventions §11). */
const dateOf = (date: string | null) => (date === null ? null : new Date(`${date}T00:00:00.000Z`));

/** A `@db.Date` as its calendar date, read at UTC, never through a zone (conventions §11). */
const calendarDateOf = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

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
    /** The space's subscription made with this idempotency key: its id and customer, or `null`. */
    findByKey(
      spaceId: number,
      key: string,
      tx: Tx,
    ): Promise<{ id: number; customerId: number } | null> {
      return tx.subscription.findUnique({
        where: { spaceId_idempotencyKey: { spaceId, idempotencyKey: key } },
        select: { id: true, customerId: true },
      });
    },

    /**
     * Inserts the subscription: its id, or `refused` when a foreign key refused it — under the
     * caller's checks of the customer, the package and the renewed one, only the shift, which must be
     * the space's own (through `(shift_id, space_id)`). Anything else is rethrown.
     */
    async create(
      subscription: SubscriptionToCreate,
      tx: Tx,
    ): Promise<{ id: number } | { refused: 'shiftId' }> {
      const { key, startsOn, endsOn, priceTyped, ...terms } = subscription;
      try {
        return await tx.subscription.create({
          data: {
            ...terms,
            idempotencyKey: key,
            startsOn: dateOf(startsOn),
            endsOn: dateOf(endsOn),
            priceSetById: priceTyped?.byId ?? null,
            priceReason: priceTyped?.reason ?? null,
          },
          select: { id: true },
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) return { refused: 'shiftId' };
        throw error;
      }
    },

    /**
     * Locks the space's subscription's row (`FOR UPDATE`): its id, its customer and the subscription
     * that renewed it (`null` while none has), or `null` when it is not the space's.
     */
    async lockIn(spaceId: number, id: number, tx: Tx): Promise<LockedSubscription | null> {
      const [locked] = await tx.$queryRaw<
        { id: number; customer_id: number; renewed_by_id: number | null }[]
      >`
        SELECT s.id, s.customer_id,
               (SELECT r.id FROM subscriptions r WHERE r.renewal_of_id = s.id) AS renewed_by_id
        FROM subscriptions s WHERE s.id = ${id} AND s.space_id = ${spaceId}
        FOR UPDATE OF s`;
      return locked
        ? { id: locked.id, customerId: locked.customer_id, renewedById: locked.renewed_by_id }
        : null;
    },

    /**
     * A locked subscription's correctable terms, its price and billing, and whether it was ended, in
     * the caller's transaction (dates as Gaza dates).
     */
    async termsOf(
      id: number,
      tx: Tx,
    ): Promise<
      CorrectableTerms & {
        billing: SubscriptionToCreate['billing'];
        priceAgorot: number;
        ended: boolean;
      }
    > {
      const row = await tx.subscription.findUniqueOrThrow({
        where: { id },
        select: {
          name: true,
          startsOn: true,
          endsOn: true,
          totalDays: true,
          daysPerWeek: true,
          hoursPerDay: true,
          totalHours: true,
          billing: true,
          priceAgorot: true,
          endedAt: true,
        },
      });
      const { startsOn, endsOn, endedAt, ...rest } = row;
      return {
        ...rest,
        startsOn: calendarDateOf(startsOn),
        endsOn: calendarDateOf(endsOn),
        ended: endedAt !== null,
      };
    },

    /** Writes a correction of the terms (dates as Gaza dates). */
    async correct(id: number, data: Partial<CorrectableTerms>, tx: Tx): Promise<void> {
      const { startsOn, endsOn, ...rest } = data;
      await tx.subscription.update({
        where: { id },
        data: {
          ...rest,
          ...(startsOn !== undefined && { startsOn: dateOf(startsOn) }),
          ...(endsOn !== undefined && { endsOn: dateOf(endsOn) }),
        },
        select: { id: true },
      });
    },

    /** Ends the subscription early: its new end (a Gaza date), when and by whom. */
    async end(
      id: number,
      { endsOn, endedAt, endedById }: { endsOn: string; endedAt: Date; endedById: number },
      tx: Tx,
    ): Promise<void> {
      await tx.subscription.update({
        where: { id },
        data: { endsOn: dateOf(endsOn), endedAt, endedById },
        select: { id: true },
      });
    },

    /** Writes a corrected price and billing, with who typed the price and why. */
    async correctPrice(
      id: number,
      price: {
        billing: SubscriptionToCreate['billing'];
        priceAgorot: number;
        byId: number;
        reason: string;
      },
      tx: Tx,
    ): Promise<void> {
      await tx.subscription.update({
        where: { id },
        data: {
          billing: price.billing,
          priceAgorot: price.priceAgorot,
          priceSetById: price.byId,
          priceReason: price.reason,
        },
        select: { id: true },
      });
    },

    /** Every check-in of the space's subscription, the earliest first, then by id. */
    checkInsOf(spaceId: number, subscriptionId: number): Promise<SubscriptionCheckIn[]> {
      return prisma.checkIn.findMany({
        where: { spaceId, subscriptionId },
        select: { id: true, checkedInAt: true, checkedOutAt: true, checkoutMethod: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** The subscription that renewed this one of the space, or `null`. */
    async renewedBy(spaceId: number, subscriptionId: number): Promise<number | null> {
      const renewal = await prisma.subscription.findFirst({
        where: { spaceId, renewalOfId: subscriptionId },
        select: { id: true },
      });
      return renewal?.id ?? null;
    },

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
               s.renewal_of_id, s.price_set_by_id, s.price_reason, s.ended_at, s.ended_by_id,
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
