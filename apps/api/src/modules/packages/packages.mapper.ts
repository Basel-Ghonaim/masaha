import type { SpacePackage } from '@masaha/shared/packages';

import type { PackageRow } from './packages.repository.ts';

/** A package's row, as the contract's `SpacePackage` shows it. */
export function toSpacePackage(row: PackageRow): SpacePackage {
  return {
    id: row.id,
    name: row.name,
    validityDays: row.validityDays,
    totalDays: row.totalDays,
    daysPerWeek: row.daysPerWeek,
    hoursPerDay: row.hoursPerDay,
    totalHours: row.totalHours,
    billing: row.billing,
    priceAgorot: row.priceAgorot,
    audience: row.audience,
    shiftId: row.shiftId,
    isActive: row.isActive,
  };
}
