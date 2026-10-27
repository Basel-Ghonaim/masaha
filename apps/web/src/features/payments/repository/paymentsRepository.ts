import type { PaymentRow, PaymentsMeta, PaymentsQuery } from '@masaha/shared/payments';
import { api, type Page } from '@shared/api';

/**
 * The space's payments on the server (docs/api/api-contract.md §5, Front desk (managed)): a page of
 * them, the latest received first, with the totals of the whole filter. The void is the desk's
 * (`features/desk`).
 */
export interface PaymentsRepository {
  /** A page of the payments the query finds, and the totals of all of them. */
  list(spaceId: number, query: PaymentsQuery): Promise<Page<PaymentRow[], PaymentsMeta>>;
}

export function createPaymentsRepository(): PaymentsRepository {
  return {
    list: (spaceId, query) =>
      api.getPage<PaymentRow[], PaymentsMeta>(`/manage/spaces/${String(spaceId)}/payments`, {
        params: query,
      }),
  };
}
