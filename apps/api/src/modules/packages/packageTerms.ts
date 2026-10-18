import type { CreatePackageRequest, UpdatePackageRequest } from '@masaha/shared/packages';

import type { AuditValues } from '../../shared/audit/index.ts';
import type { PackageData, PackageRow, PackageTerms } from './packages.repository.ts';

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

/** What an edit changes, and what its audit entry records of it. */
export interface PackageChange {
  /** Only the fields set to a new value. */
  data: PackageData;
  /** Those fields, as they were. */
  before: AuditValues;
  /** Those fields, as they become. */
  after: AuditValues;
}

/**
 * What an edit changes: a field the edit sets to a value other than the current one. An absent field
 * is kept, and `null` clears a limit or the shift; the active flag is one of the fields, a package's
 * retirement being an edit like any other. An edit that changes nothing has empty `data`.
 */
export function packageChange(current: PackageRow, edit: UpdatePackageRequest): PackageChange {
  const requested: PackageData = { ...edit };
  const changed = (Object.keys(requested) as (keyof PackageData)[]).filter(
    (field) => requested[field] !== undefined && requested[field] !== current[field],
  );
  const pick = (from: Partial<PackageRow>) =>
    Object.fromEntries(changed.map((field) => [field, from[field]])) as PackageData;
  const data = pick(requested);
  return { data, before: packageValues(pick(current)), after: packageValues(data) };
}
