import { prisma } from '../../../db/index.ts';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.ts';
import { IN_ORDER } from '../listOrder.ts';

const NAMES = { id: true, nameAr: true, nameEn: true } as const;

const GOVERNORATE = {
  ...NAMES,
  areas: { where: { isActive: true }, select: NAMES, orderBy: IN_ORDER },
} as const satisfies Prisma.GovernorateSelect;

const AMENITY = {
  ...NAMES,
  key: true,
  icon: true,
  isFilterable: true,
} as const satisfies Prisma.AmenitySelect;

export type CatalogueGovernorateRow = Prisma.GovernorateGetPayload<{ select: typeof GOVERNORATE }>;
export type CatalogueAmenityRow = Prisma.AmenityGetPayload<{ select: typeof AMENITY }>;

export function createCatalogueRepository(db: PrismaClient = prisma) {
  return {
    /** The active governorates, each with its active areas, both in order. */
    findActiveGovernorates(): Promise<CatalogueGovernorateRow[]> {
      return db.governorate.findMany({
        where: { isActive: true },
        select: GOVERNORATE,
        orderBy: IN_ORDER,
      });
    },

    /** The active amenities, in order. */
    findActiveAmenities(): Promise<CatalogueAmenityRow[]> {
      return db.amenity.findMany({ where: { isActive: true }, select: AMENITY, orderBy: IN_ORDER });
    },
  };
}
