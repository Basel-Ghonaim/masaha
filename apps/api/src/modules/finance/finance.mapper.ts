import type { Collections } from '@masaha/shared/finance';

import type { CollectionsRow } from '../payments/index.ts';

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
