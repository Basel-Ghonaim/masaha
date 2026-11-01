import type { DebtsQuery, PayersQuery } from '@masaha/shared/finance';

/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const financeKeys = {
  /** A month's income; `current` while the address names no month. */
  income: (spaceId: number, month: string) =>
    ['space', spaceId, 'finance', 'income', month] as const,
  /** A page of who owes or who is in credit. */
  debts: (spaceId: number, query: DebtsQuery) =>
    ['space', spaceId, 'finance', 'debts', query] as const,
  /** A page of who paid in a month. */
  payers: (spaceId: number, query: PayersQuery) =>
    ['space', spaceId, 'finance', 'payers', query] as const,
  /** A month's occupancy statistics. */
  occupancy: (spaceId: number, month: string) =>
    ['space', spaceId, 'finance', 'occupancy', month] as const,
};
