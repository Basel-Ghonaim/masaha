import type { Customer } from '@masaha/shared/customers';

import type { CustomerRow } from './customers.repository.ts';

/** A customer's row, as the contract's `Customer` shows it. */
export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}
