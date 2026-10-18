import { isForeignKeyViolation, isUniqueViolation, prisma, type Tx } from '../../db/index.ts';
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

/** The ten terms a create writes; an inactive package is a create's decision, never its request's. */
export type PackageTerms = Omit<PackageRow, 'id' | 'isActive'>;

/** What an edit writes: the fields it sets, each with its new value. */
export type PackageData = Partial<Omit<PackageRow, 'id'>>;

/** A written package, or the key that refused the write. */
export type PackageWrite = { package: PackageRow } | { refused: 'name' | 'shiftId' };

/**
 * A write, or the key that refused it, turned into its field. Two keys can refuse one: the name's own
 * `packages_space_id_name_key` (P2002), and `(shift_id, space_id) → space_shifts(id, space_id)` (P2003),
 * which refuses another space's shift. Under the space's lock those are the only two: a locked row is
 * never hard-deleted, so the space's own key cannot miss. Anything else is rethrown.
 */
async function written(write: Promise<PackageRow>): Promise<PackageWrite> {
  try {
    return { package: await write };
  } catch (error) {
    if (isUniqueViolation(error, 'packages_space_id_name_key')) return { refused: 'name' };
    if (isForeignKeyViolation(error)) return { refused: 'shiftId' };
    throw error;
  }
}

/** A space's packages (docs/api/api-contract.md §5, Packages (managed)). */
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

    /**
     * The place after the last package's, retired ones included, so it is after every one of them.
     * Read under the space's lock, which every write takes first, so two creates never share it.
     */
    async nextPlace(spaceId: number, tx: Tx): Promise<number> {
      const { _max } = await tx.package.aggregate({
        _max: { sortOrder: true },
        where: { spaceId },
      });
      return (_max.sortOrder ?? -1) + 1;
    },

    /** The new package, written with the place the caller read. */
    create(spaceId: number, terms: PackageTerms, sortOrder: number, tx: Tx): Promise<PackageWrite> {
      return written(
        tx.package.create({ data: { ...terms, spaceId, sortOrder }, select: PACKAGE }),
      );
    },

    /**
     * One package of the space, through the compound key `(id, spaceId)`, so it names no row of
     * another space even when the caller passes that space's id.
     */
    findIn(spaceId: number, id: number, tx: Tx = prisma): Promise<PackageRow | null> {
      return tx.package.findUnique({ where: { id_spaceId: { id, spaceId } }, select: PACKAGE });
    },

    /** The edit, through the same compound key, so it can touch no other space's row. */
    update(spaceId: number, id: number, data: PackageData, tx: Tx): Promise<PackageWrite> {
      return written(
        tx.package.update({ where: { id_spaceId: { id, spaceId } }, data, select: PACKAGE }),
      );
    },
  };
}

export type PackagesRepository = ReturnType<typeof createPackagesRepository>;
