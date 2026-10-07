import type { Shift } from '@masaha/shared/spaces';

import { isForeignKeyViolation, prisma, type Tx } from '../../../db/index.ts';
import type { ShiftData } from './shiftChanges.ts';

const SHIFT = {
  id: true,
  nameAr: true,
  nameEn: true,
  startsMinute: true,
  endsMinute: true,
} as const;

/**
 * A name no saved shift can hold: user text never has a control character (conventions §3). A
 * shift holds it only inside a save, while names move between shifts, and never once it commits.
 */
function passingName(id: number): string {
  return `\u0001${String(id)}`;
}

/** A space's shifts. */
export function createShiftsRepository() {
  return {
    /** In the order they are shown in. */
    listFor(spaceId: number, tx: Tx = prisma): Promise<Shift[]> {
      return tx.spaceShift.findMany({
        where: { spaceId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: SHIFT,
      });
    },

    /** The ids of the space's shifts: what a price may name. */
    async idsOf(spaceId: number, tx: Tx): Promise<Set<number>> {
      const rows = await tx.spaceShift.findMany({ where: { spaceId }, select: { id: true } });
      return new Set(rows.map(({ id }) => id));
    },

    /**
     * Removes these shifts of the space, or none when anything still uses one: a price, a package,
     * a subscription or a visit, whose foreign keys refuse the delete (data-model).
     */
    async remove(spaceId: number, ids: readonly number[], tx: Tx): Promise<'removed' | 'inUse'> {
      if (ids.length === 0) return 'removed';
      try {
        await tx.spaceShift.deleteMany({ where: { spaceId, id: { in: [...ids] } } });
        return 'removed';
      } catch (error) {
        if (isForeignKeyViolation(error)) return 'inUse';
        throw error;
      }
    },

    /** Gives the shift a passing name, so another can take its own. */
    async moveAside(id: number, tx: Tx): Promise<void> {
      await tx.spaceShift.update({
        where: { id },
        data: { nameAr: passingName(id) },
        select: { id: true },
      });
    },

    async update(id: number, data: ShiftData, tx: Tx): Promise<void> {
      await tx.spaceShift.update({ where: { id }, data, select: { id: true } });
    },

    async create(spaceId: number, data: ShiftData, tx: Tx): Promise<void> {
      await tx.spaceShift.create({ data: { spaceId, ...data }, select: { id: true } });
    },
  };
}
