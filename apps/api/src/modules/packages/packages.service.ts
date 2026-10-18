import type {
  CreatePackageRequest,
  SpacePackage,
  UpdatePackageRequest,
} from '@masaha/shared/packages';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { packageChange, packageValues, toPackageTerms } from './packageTerms.ts';
import { toSpacePackage } from './packages.mapper.ts';
import {
  createPackagesRepository,
  type PackageRow,
  type PackageWrite,
} from './packages.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
}

/**
 * A space's packages: the subscription templates its owner keeps, private to its staff
 * (docs/api/api-contract.md §5, Packages (managed)). The read is one query with no lock (P4): one
 * statement is never half of a change, and the managed boundary has already admitted the caller.
 */
export function createPackagesService({ runInTransaction, audit, spaces }: Dependencies) {
  const packages = createPackagesRepository();

  /**
   * Locks the space and decides whether `actor` may change its packages, on its links as they are
   * under the lock: every link change takes that lock, so a link ended meanwhile still decides
   * (finding 43).
   */
  async function lockFor(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, 'packages.manage', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  /** The written package, or what the database's keys refused the write for, on its own field. */
  function packageOf(write: PackageWrite): PackageRow {
    if ('refused' in write) {
      if (write.refused === 'name') {
        throw AppError.conflict(undefined, 'Package name taken', { name: ['not_unique'] });
      }
      throw AppError.validation({ shiftId: ['invalid_choice'] });
    }
    return write.package;
  }

  return {
    /** Every package of the space, retired ones included, whole; a list's order is its array's. */
    async list(spaceId: number): Promise<SpacePackage[]> {
      return (await packages.listFor(spaceId)).map(toSpacePackage);
    },

    /**
     * Adds a package, in one transaction and in this order: the space's lock; `can()` on the links
     * read under it; the package, written after the last (D4); its audit entry (D8). A name another
     * package of the space holds, retired or not, and a shift that is not one of the space's, are
     * refused by the database's own keys inside this transaction, each on its field, so nothing of
     * the change survives the refusal.
     */
    create(actor: Actor, space: LoadedSpace, request: CreatePackageRequest): Promise<SpacePackage> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const terms = toPackageTerms(request);
        const sortOrder = await packages.nextPlace(space.id, tx);
        const row = packageOf(await packages.create(space.id, terms, sortOrder, tx));
        await audit(
          {
            actorId: actor.id,
            action: 'package.created',
            entityType: 'package',
            entityId: row.id,
            spaceId: space.id,
            after: packageValues(terms),
          },
          tx,
        );
        return toSpacePackage(row);
      });
    },

    /**
     * Edits a package, in one transaction and in this order: the space's lock; `can()` on the links
     * read under it; the package, found among the space's own through its compound key; only the
     * fields the edit sets to a new value, `null` clearing a limit or the shift; its audit entry
     * (D8). An edit that changes nothing writes and audits nothing, and answers the package as it
     * is. A package that is not the space's is `not_found`; a name another package holds, and a
     * shift that is not one of the space's, are refused by the database's keys on their own fields,
     * so nothing of the change survives the refusal.
     */
    update(
      actor: Actor,
      space: LoadedSpace,
      packageId: number,
      edit: UpdatePackageRequest,
    ): Promise<SpacePackage> {
      return runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const current = await packages.findIn(space.id, packageId, tx);
        if (!current) throw AppError.notFound(undefined, 'Package not found');
        const { data, before, after } = packageChange(current, edit);
        if (Object.keys(data).length === 0) return toSpacePackage(current);

        const row = packageOf(await packages.update(space.id, packageId, data, tx));
        await audit(
          {
            actorId: actor.id,
            action: 'package.edited',
            entityType: 'package',
            entityId: row.id,
            spaceId: space.id,
            before,
            after,
          },
          tx,
        );
        return toSpacePackage(row);
      });
    },
  };
}

export type PackagesService = ReturnType<typeof createPackagesService>;
