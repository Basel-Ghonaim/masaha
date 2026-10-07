import type { Price } from '@masaha/shared/spaces';

import { prisma, type Tx } from '../../../db/index.ts';

const PRICE = {
  period: true,
  audience: true,
  shiftId: true,
  labelAr: true,
  labelEn: true,
  amountAgorot: true,
} as const;

/** A space's published prices. */
export function createPricesRepository() {
  return {
    /** In the order they are shown in. */
    listFor(spaceId: number, tx: Tx = prisma): Promise<Price[]> {
      return tx.spacePrice.findMany({
        where: { spaceId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: PRICE,
      });
    },

    /**
     * Replaces the prices, in their order, one statement at a time (finding 11). Nothing refers to
     * a price, so they are written anew.
     */
    async replace(spaceId: number, prices: readonly Price[], tx: Tx): Promise<void> {
      await tx.spacePrice.deleteMany({ where: { spaceId } });
      for (const [sortOrder, price] of prices.entries()) {
        await tx.spacePrice.create({
          data: { spaceId, ...price, sortOrder },
          select: { id: true },
        });
      }
    },
  };
}
