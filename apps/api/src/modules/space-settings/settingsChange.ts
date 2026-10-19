import type { UpdateSpaceSettingsRequest } from '@masaha/shared/space-settings';

import type { AuditValues } from '../../shared/audit/index.ts';
import type { SettingsData, SettingsRow } from './space-settings.repository.ts';

/** What an edit changes, and what its audit entry records of it. */
export interface SettingsChange {
  /** Only the fields set to a new value. */
  data: SettingsData;
  /** Those fields, as they were. */
  before: AuditValues;
  /** Those fields, as they become. */
  after: AuditValues;
}

/**
 * What an edit changes: a field the edit sets to a value other than the current one. An absent field
 * is kept, and `null` clears the stay limit or the reminder. The rounding rule and its minutes are
 * compared field by field, so a rule kept with new minutes changes only the minutes. An edit that
 * changes nothing has empty `data`.
 */
export function settingsChange(
  current: SettingsRow,
  edit: UpdateSpaceSettingsRequest,
): SettingsChange {
  const requested: SettingsData = { ...edit };
  const changed = (Object.keys(requested) as (keyof SettingsData)[]).filter(
    (field) => requested[field] !== undefined && requested[field] !== current[field],
  );
  const pick = (from: SettingsData) =>
    Object.fromEntries(changed.map((field) => [field, from[field]])) as SettingsData;
  const data = pick(requested);
  return { data, before: { ...pick(current) }, after: { ...data } };
}
