import type { Rates, VisitCharge } from '@masaha/shared/visits';

import { isForeignKeyViolation, prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';
import type { Charge } from './visitCharge.ts';

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
  writtenOffAt: true,
  writtenOffById: true,
  writeOffReason: true,
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

/** An open visit as the auto check-out reads it: its space, its check-in and its rates. */
export interface OpenStay {
  id: number;
  spaceId: number;
  checkedInAt: Date;
  hourRateAgorot: number | null;
  dayRateAgorot: number | null;
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

    /** Every open visit, of every space, the earliest checked in first, then by id. */
    openEverywhere(): Promise<OpenStay[]> {
      return prisma.visit.findMany({
        where: { checkedOutAt: null },
        select: {
          id: true,
          spaceId: true,
          checkedInAt: true,
          hourRateAgorot: true,
          dayRateAgorot: true,
        },
        orderBy: [{ checkedInAt: 'asc' }, { id: 'asc' }],
      });
    },

    /** Locks the visit's row (`FOR UPDATE`) while it is still open: whether it was. */
    async lockOpen(visitId: number, tx: Tx): Promise<boolean> {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM visits WHERE id = ${visitId} AND checked_out_at IS NULL FOR UPDATE`;
      return locked.length > 0;
    },

    /** Closes the visit by the auto check-out, at its due time, with its charge or none. */
    async closeAuto(
      visitId: number,
      { checkedOutAt, charge }: { checkedOutAt: Date; charge: Charge | null },
      tx: Tx,
    ): Promise<void> {
      await tx.visit.update({
        where: { id: visitId },
        data: {
          checkedOutAt,
          checkoutMethod: 'AUTO',
          roundingRule: charge?.roundingRule ?? null,
          roundingMinutes: charge?.roundingMinutes ?? null,
          capApplied: charge?.capApplied ?? null,
          chargeAgorot: charge?.amountAgorot ?? null,
        },
        select: { id: true },
      });
    },

    /**
     * A page of the space's closed visits with no charge, the latest closed first, then by id, and
     * how many there are.
     */
    async unpricedIn(
      spaceId: number,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: DeskVisitRow[]; total: number }> {
      const where = { spaceId, checkedOutAt: { not: null }, chargeAgorot: null };
      const [rows, total] = await Promise.all([
        prisma.visit.findMany({
          where,
          select: DESK_VISIT,
          orderBy: [{ checkedOutAt: 'desc' }, { id: 'desc' }],
          skip,
          take,
        }),
        prisma.visit.count({ where }),
      ]);
      return { rows, total };
    },

    /** The space's visits closed by the auto check-out and not written off, each with its charge. */
    autoClosedIn(spaceId: number): Promise<{ id: number; chargeAgorot: number | null }[]> {
      return prisma.visit.findMany({
        where: { spaceId, checkoutMethod: 'AUTO', writtenOffAt: null },
        select: { id: true, chargeAgorot: true },
      });
    },

    /**
     * A page of the space's visits closed by the auto check-out and not written off, but these,
     * the latest closed first, then by id, and how many there are.
     */
    async autoClosedPage(
      spaceId: number,
      exceptIds: readonly number[],
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: DeskVisitRow[]; total: number }> {
      const where = {
        spaceId,
        checkoutMethod: 'AUTO' as const,
        writtenOffAt: null,
        id: { notIn: [...exceptIds] },
      };
      const [rows, total] = await Promise.all([
        prisma.visit.findMany({
          where,
          select: DESK_VISIT,
          orderBy: [{ checkedOutAt: 'desc' }, { id: 'desc' }],
          skip,
          take,
        }),
        prisma.visit.count({ where }),
      ]);
      return { rows, total };
    },

    /** Sets a closed visit's charge typed by hand, with who typed it and why. */
    price(
      visitId: number,
      {
        amountAgorot,
        typedById,
        reason,
      }: { amountAgorot: number; typedById: number; reason: string },
      tx: Tx,
    ): Promise<DeskVisitRow> {
      return tx.visit.update({
        where: { id: visitId },
        data: {
          chargeAgorot: amountAgorot,
          chargeSetById: typedById,
          chargeReason: reason,
          roundingRule: null,
          roundingMinutes: null,
          capApplied: null,
        },
        select: DESK_VISIT,
      });
    },

    /** Writes the visit off: when, by whom and why. */
    writeOff(
      visitId: number,
      { at, byId, reason }: { at: Date; byId: number; reason: string },
      tx: Tx,
    ): Promise<DeskVisitRow> {
      return tx.visit.update({
        where: { id: visitId },
        data: { writtenOffAt: at, writtenOffById: byId, writeOffReason: reason },
        select: DESK_VISIT,
      });
    },

    /** Sets the customer the visit's unpaid rest is left to. */
    leaveTo(visitId: number, customerId: number, tx: Tx): Promise<DeskVisitRow> {
      return tx.visit.update({ where: { id: visitId }, data: { customerId }, select: DESK_VISIT });
    },

    /** Clears the visit's write-off. */
    undoWriteOff(visitId: number, tx: Tx): Promise<DeskVisitRow> {
      return tx.visit.update({
        where: { id: visitId },
        data: { writtenOffAt: null, writtenOffById: null, writeOffReason: null },
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
