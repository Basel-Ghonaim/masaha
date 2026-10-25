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
     * The space's standard price (no custom label) of this period, audience and shift (none: the
     * price without one), which the unique keys make one at most; nothing when there is none.
     */
    findStandard(
      spaceId: number,
      key: Pick<Price, 'period' | 'audience'> & { shiftId?: number },
      tx: Tx = prisma,
    ): Promise<Price | null> {
      return tx.spacePrice.findFirst({
        where: {
          spaceId,
          period: key.period,
          audience: key.audience,
          shiftId: key.shiftId ?? null,
          labelAr: null,
        },
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
