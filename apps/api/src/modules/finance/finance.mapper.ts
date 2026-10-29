import { gazaClockOf } from '@masaha/shared/core';
import type { BalanceRow, Collections } from '@masaha/shared/finance';

import type { CustomerContact } from '../customers/index.ts';
import type { BalancePageRow, CollectionsRow } from '../payments/index.ts';

/** A staff member's collections, named, its methods' sums as the answer's `byMethod`. */
export function toCollections(
  { recordedById, count, totalAgorot, cashAgorot, transferAgorot }: CollectionsRow,
  name: string,
): Collections {
  return {
    recordedBy: { id: recordedById, name },
    count,
    totalAgorot,
    byMethod: { CASH: cashAgorot, TRANSFER: transferAgorot },
  };
}

/**
 * A customer's balance as the debts list shows it: the customer's contact, archived or not; its
 * oldest item still owing, named, with the Gaza day it was made.
 */
export function toBalanceRow(
  { amountAgorot, oldest }: BalancePageRow,
  customer: CustomerContact,
  name: string | null,
): BalanceRow {
  return {
    customer,
    amountAgorot,
    oldestItem: oldest && {
      kind: oldest.kind,
      id: oldest.id,
      name,
      since: gazaClockOf(oldest.createdAt).date,
    },
  };
}
