import type { AuditEntry, AuditValues } from '../../shared/audit/index.ts';

/** The lookups the admin keeps; each is an audit entry's entity type. */
export type LookupEntity = 'governorate' | 'area' | 'amenity';

/** An audit entry as the lookups name it; the service adds who acted and on which row. */
export type LookupAudit = Pick<AuditEntry, 'action' | 'entityType' | 'before' | 'after'>;

/** A lookup's editable fields, with its active flag. */
type Editable = AuditValues & { readonly isActive: boolean };

// The audited actions' names are stable, because an entry keeps its name for good
// (docs/backend/conventions.md §6). Each is `<entity>.<verb>`.

/** The entry of a lookup added: what it was created with. */
export function added(entity: LookupEntity, after: AuditValues): LookupAudit {
  return { action: `${entity}.added`, entityType: entity, after };
}

/**
 * What a PATCH changes, and the entries it audits. Only a field the patch sets to a new value is
 * written. A new name (or any other field) is `edited`, recording only the fields that changed; the
 * active flag is `hidden` or `restored`. A patch that does both audits both, `edited` first; a patch
 * that changes nothing writes and audits nothing.
 */
export function lookupChange<T extends Editable>(
  entity: LookupEntity,
  current: T,
  patch: Partial<T>,
): { data: Partial<T>; entries: LookupAudit[] } {
  const changed = (Object.keys(patch) as (keyof T & string)[]).filter(
    (field) => patch[field] !== undefined && patch[field] !== current[field],
  );
  const pick = (fields: readonly (keyof T & string)[], from: Partial<T>): AuditValues =>
    Object.fromEntries(fields.map((field) => [field, from[field] ?? null]));

  const entries: LookupAudit[] = [];
  const edited = changed.filter((field) => field !== 'isActive');
  if (edited.length > 0) {
    entries.push({
      action: `${entity}.edited`,
      entityType: entity,
      before: pick(edited, current),
      after: pick(edited, patch),
    });
  }
  if (changed.includes('isActive')) {
    entries.push({
      action: `${entity}.${current.isActive ? 'hidden' : 'restored'}`,
      entityType: entity,
      before: { isActive: current.isActive },
      after: { isActive: !current.isActive },
    });
  }
  return { data: pick(changed, patch) as Partial<T>, entries };
}
