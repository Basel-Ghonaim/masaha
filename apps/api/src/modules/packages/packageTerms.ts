import type { CreatePackageRequest } from '@masaha/shared/packages';

import type { AuditValues } from '../../shared/audit/index.ts';
import type { PackageData, PackageTerms } from './packages.repository.ts';

// A package's terms as a create request carries them (an optional field may be absent), as the row
// stores them (each of the ten fields, a limit or the shift `null` when there is none), and as an
// audit entry records them.

/** The terms a create request describes; an absent limit or shift is none. */
export function toPackageTerms(request: CreatePackageRequest): PackageTerms {
  return {
    name: request.name,
    validityDays: request.validityDays,
    totalDays: request.totalDays ?? null,
    daysPerWeek: request.daysPerWeek ?? null,
    hoursPerDay: request.hoursPerDay ?? null,
    totalHours: request.totalHours ?? null,
    billing: request.billing,
    priceAgorot: request.priceAgorot,
    audience: request.audience,
    shiftId: request.shiftId ?? null,
  };
}

/** A package's fields as an audit entry records them. */
export function packageValues(fields: PackageTerms | PackageData): AuditValues {
  return { ...fields };
}
