import type { PaymentsQuery } from '@masaha/shared/payments';

/** The capability's keys, scoped as docs/frontend/architecture.md §7 says: under the space's. */
export const paymentsKeys = {
  /** Every read of the space's payments: a desk write reads them again through the space's scope. */
  all: (spaceId: number) => ['space', spaceId, 'payments'] as const,
  /** One page of the owner's ledger, by its whole query. */
  list: (spaceId: number, query: PaymentsQuery) =>
    ['space', spaceId, 'payments', 'list', query] as const,
  /** One page of reception's own payments of today. */
  mine: (spaceId: number, page: number) => ['space', spaceId, 'payments', 'mine', page] as const,
};
