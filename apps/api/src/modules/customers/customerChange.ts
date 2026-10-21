import type { UpdateCustomerRequest } from '@masaha/shared/customers';

import type { AuditValues } from '../../shared/audit/index.ts';
import type { CustomerData, CustomerRow } from './customers.repository.ts';

/** What an edit changes, and what its audit entry records of it. */
export interface CustomerChange {
  /** Only the fields set to a new value. */
  data: CustomerData;
  /** Those fields, as they were. */
  before: AuditValues;
  /** Those fields, as they become. */
  after: AuditValues;
}

/**
 * What an edit changes: a field the edit sets to a value other than the current one. An absent field
 * is kept, and `null` clears the phone. An edit that changes nothing has empty `data`.
 */
export function customerChange(current: CustomerRow, edit: UpdateCustomerRequest): CustomerChange {
  const changed = (['name', 'phone'] as const).filter(
    (field) => edit[field] !== undefined && edit[field] !== current[field],
  );
  const pick = (from: CustomerData) =>
    Object.fromEntries(changed.map((field) => [field, from[field]])) as CustomerData;
  const data = pick(edit);
  return { data, before: { ...pick(current) }, after: { ...data } };
}
