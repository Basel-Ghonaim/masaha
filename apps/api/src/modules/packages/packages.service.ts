import type { SpacePackage } from '@masaha/shared/packages';

import { toSpacePackage } from './packages.mapper.ts';
import { createPackagesRepository } from './packages.repository.ts';

/**
 * A space's packages: the subscription templates its owner keeps, private to its staff
 * (docs/api/api-contract.md Â§5, Packages (managed)). The read is one query with no lock (P4): one
 * statement is never half of a change, and the managed boundary has already admitted the caller.
 */
export function createPackagesService() {
  const packages = createPackagesRepository();

  return {
    /** Every package of the space, retired ones included, whole; a list's order is its array's. */
    async list(spaceId: number): Promise<SpacePackage[]> {
      return (await packages.listFor(spaceId)).map(toSpacePackage);
    },
  };
}

export type PackagesService = ReturnType<typeof createPackagesService>;
