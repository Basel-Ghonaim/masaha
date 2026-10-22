import type { CorrectSubscriptionRequest } from '@masaha/shared/subscriptions';

import type { AuditValues } from '../../shared/audit/index.ts';

/** The fields the staff correct: the name, the dates (Gaza dates) and the limits. */
export interface CorrectableTerms {
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  totalDays: number | null;
  daysPerWeek: number | null;
  hoursPerDay: number | null;
  totalHours: number | null;
}

/** What a correction changes, and what its audit entry records of it. */
export interface SubscriptionChange {
  /** Only the fields set to a new value. */
  data: Partial<CorrectableTerms>;
  /** Those fields, as they were. */
  before: AuditValues;
  /** Those fields, as they become. */
  after: AuditValues;
}

const FIELDS = [
  'name',
  'startsOn',
  'endsOn',
  'totalDays',
  'daysPerWeek',
  'hoursPerDay',
  'totalHours',
] as const satisfies readonly (keyof CorrectableTerms)[];

/**
 * What a correction changes, as `packageChange` decides an edit: a field set to a value other than
 * the current one. An absent field is kept, and `null` clears a limit or the end. A correction that
 * changes nothing has empty `data`.
 */
export function subscriptionChange(
  current: CorrectableTerms,
  edit: CorrectSubscriptionRequest,
): SubscriptionChange {
  const changed = FIELDS.filter(
    (field) => edit[field] !== undefined && edit[field] !== current[field],
  );
  const pick = (from: Partial<CorrectableTerms>) =>
    Object.fromEntries(changed.map((field) => [field, from[field]])) as Partial<CorrectableTerms>;
  const data = pick(edit);
  return { data, before: { ...pick(current) }, after: { ...data } };
}
