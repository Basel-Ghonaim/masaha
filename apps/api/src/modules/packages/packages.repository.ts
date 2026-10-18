import { prisma, type Tx } from '../../db/index.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

const PACKAGE = {
  id: true,
  name: true,
  validityDays: true,
  totalDays: true,
  daysPerWeek: true,
  hoursPerDay: true,
  totalHours: true,
  billing: true,
  priceAgorot: true,
  audience: true,
  shiftId: true,
  isActive: true,
} as const satisfies Prisma.PackageSelect;

export type PackageRow = Prisma.PackageGetPayload<{ select: typeof PACKAGE }>;

/** A space's packages (docs/api/api-contract.md Â§5, Packages (managed)). */
export function createPackagesRepository() {
  return {
    /**
     * Every package of the space, retired ones included, by place then name: a list's order is its
     * array's (decision D4). One query, so no transaction is needed for it (P4).
     */
    listFor(spaceId: number, tx: Tx = prisma): Promise<PackageRow[]> {
      return tx.package.findMany({
        where: { spaceId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: PACKAGE,
      });
    },
  };
}

export type PackagesRepository = ReturnType<typeof createPackagesRepository>;
