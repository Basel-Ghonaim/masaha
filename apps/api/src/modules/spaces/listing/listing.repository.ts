import { prisma } from '../../../db/index.ts';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.ts';
import type { GroupDates } from '../staleness.ts';

const LISTED = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  areaId: true,
  isHidden: true,
  profileUpdatedAt: true,
  hoursUpdatedAt: true,
  pricesUpdatedAt: true,
  amenitiesUpdatedAt: true,
  contactsUpdatedAt: true,
} as const satisfies Prisma.SpaceSelect;

export type ListedSpaceRecord = Prisma.SpaceGetPayload<{ select: typeof LISTED }>;

/** What the admin's list filters by, on what `spaces` owns; every field narrows it. */
export interface ListingFilter {
  /** Only these spaces, or every space but these: an owning module's filter, resolved to ids. */
  ids?: { in: readonly number[] } | { notIn: readonly number[] };
  isHidden?: boolean;
  areaIds?: readonly number[];
  /** A space with at least one group older than its cut-off. */
  staleBefore?: GroupDates;
  /** Part of either name, whatever the case. */
  q?: string;
}

function whereOf({
  ids,
  isHidden,
  areaIds,
  staleBefore,
  q,
}: ListingFilter): Prisma.SpaceWhereInput {
  const and: Prisma.SpaceWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
      ],
    });
  }
  if (staleBefore) {
    and.push({
      OR: [
        { profileUpdatedAt: { lt: staleBefore.profile } },
        { hoursUpdatedAt: { lt: staleBefore.hours } },
        { pricesUpdatedAt: { lt: staleBefore.prices } },
        { amenitiesUpdatedAt: { lt: staleBefore.amenities } },
        { contactsUpdatedAt: { lt: staleBefore.contacts } },
      ],
    });
  }
  return {
    deletedAt: null,
    ...(ids && { id: 'in' in ids ? { in: [...ids.in] } : { notIn: [...ids.notIn] } }),
    ...(isHidden !== undefined && { isHidden }),
    ...(areaIds && { areaId: { in: [...areaIds] } }),
    ...(and.length > 0 && { AND: and }),
  };
}

export function createListingRepository(db: PrismaClient = prisma) {
  return {
    /**
     * One page of the spaces that pass the filter, by English name, and how many pass it in all; a
     * soft-deleted space never does. The two queries run in parallel (conventions §5).
     */
    async findPage(
      filter: ListingFilter,
      { skip, take }: { skip: number; take: number },
    ): Promise<{ rows: ListedSpaceRecord[]; total: number }> {
      const where = whereOf(filter);
      const [rows, total] = await Promise.all([
        db.space.findMany({
          where,
          select: LISTED,
          orderBy: [{ nameEn: 'asc' }, { id: 'asc' }],
          skip,
          take,
        }),
        db.space.count({ where }),
      ]);
      return { rows, total };
    },
  };
}
