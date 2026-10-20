import type { Rates, VisitCharge } from '@masaha/shared/visits';

import { isForeignKeyViolation, prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

/** A visit still open: who, and since when. */
export interface OpenVisit {
  id: number;
  visitorName: string | null;
  customerId: number | null;
  checkedInAt: Date;
}

/** A visit as the desk reads it: the row, its charge, and its customer when it has one. */
const DESK_VISIT = {
  id: true,
  visitorName: true,
  audience: true,
  shiftId: true,
  hourRateAgorot: true,
  dayRateAgorot: true,
  checkedInAt: true,
  checkedOutAt: true,
  checkoutMethod: true,
  roundingRule: true,
  roundingMinutes: true,
  capApplied: true,
  chargeAgorot: true,
  chargeSetById: true,
  chargeReason: true,
  customer: { select: { id: true, name: true, phone: true } },
} as const satisfies Prisma.VisitSelect;

export type DeskVisitRow = Prisma.VisitGetPayload<{ select: typeof DESK_VISIT }>;

/** A new visit by name, as the desk checks it in. */
export interface NewVisit {
  spaceId: number;
  key: string;
  visitorName: string;
  audience: DeskVisitRow['audience'];
  shiftId: number | null;
  rates: Rates;
  checkedInAt: Date;
}

/** How a visit is closed: when, its charge (or none), and the customer it is left unpaid to. */
export interface VisitClosing {
  checkedOutAt: Date;
  charge: VisitCharge | null;
  customerId: number | null;
}

/** Each space's count of rows, by space; a space with none is absent. */
function countsBySpace(groups: readonly { spaceId: number; _count: { _all: number } }[]) {
  return new Map(groups.map(({ spaceId, _count }) => [spaceId, _count._all]));
}

/** The `visits` table (docs/backend/conventions.md › the front desk): the desk's visits. */
export function createVisitsRepository() {
  return {
    /** The space's visit created with this idempotency key, or `null`. */
    findByKey(spaceId: number, key: string, tx: Tx): Promise<DeskVisitRow | null> {
      return tx.visit.findUnique({
        where: { spaceId_idempotencyKey: { spaceId, idempotencyKey: key } },
        select: DESK_VISIT,
      });
    },

    /**
     * Inserts the visit, open, with its rates; `null` when the foreign key finds no such shift in
     * the space, such as another space's.
     */
    async create(visit: NewVisit, tx: Tx): Promise<DeskVisitRow | null> {
      const { spaceId, key, visitorName, audience, shiftId, rates, checkedInAt } = visit;
      try {
        return await tx.visit.create({
          data: {
            spaceId,
            idempotencyKey: key,
            visitorName,
            audience,
            shiftId,
            hourRateAgorot: rates.hourAgorot,
            dayRateAgorot: rates.dayAgorot,
            checkedInAt,
          },
          select: DESK_VISIT,
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) return null;
        throw error;
      }
    },

    /** The space's visit, or `null` when it is not the space's. */
    findIn(spaceId: number, visitId: number): Promise<DeskVisitRow | null> {
      return prisma.visit.findFirst({ where: { id: visitId, spaceId }, select: DESK_VISIT });
    },

    /** These visits of the space, with their check-in time and rates; another space's are not read. */
    ratesOf(spaceId: number, visitIds: readonly number[]) {
      return prisma.visit.findMany({
        where: { spaceId, id: { in: [...visitIds] } },
        select: { id: true, checkedInAt: true, hourRateAgorot: true, dayRateAgorot: true },
      });
    },

    /**
     * Locks the visit's row (`FOR UPDATE`, the payments trigger's own mode) and reads it; `null`
     * when it is not the space's.
     */
    async lockIn(spaceId: number, visitId: number, tx: Tx): Promise<DeskVisitRow | null> {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM visits WHERE id = ${visitId} AND space_id = ${spaceId} FOR UPDATE`;
      if (locked.length === 0) return null;
      return tx.visit.findUniqueOrThrow({ where: { id: visitId }, select: DESK_VISIT });
    },

    /** Closes the visit by the desk, with its charge and its customer. */
    close(visitId: number, { checkedOutAt, charge, customerId }: VisitClosing, tx: Tx) {
      return tx.visit.update({
        where: { id: visitId },
        data: {
          checkedOutAt,
          checkoutMethod: 'MANUAL',
          roundingRule: charge?.roundingRule ?? null,
          roundingMinutes: charge?.roundingMinutes ?? null,
          capApplied: charge?.capApplied ?? null,
          chargeAgorot: charge?.amountAgorot ?? null,
          chargeSetById: charge?.typedById ?? null,
          chargeReason: charge?.reason ?? null,
          customerId,
        },
        select: DESK_VISIT,
      });
    },

    /** The space's open visits, the earliest checked in first, then by id. */
    openIn(spaceId: number, tx: Tx = prisma): Promise<OpenVisit[]> {
      return tx.visit.findMany({
        where: { spaceId, checkedOutAt: null },
        select: { id: true, visitorName: true, customerId: true, checkedInAt: true },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** How many visits are open at each of these spaces, in one query; a space with none is absent. */
    async openCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      if (spaceIds.length === 0) return new Map();
      const groups = await prisma.visit.groupBy({
        by: ['spaceId'],
        where: { spaceId: { in: [...spaceIds] }, checkedOutAt: null },
        _count: { _all: true },
      });
      return countsBySpace(groups);
    },
  };
}
