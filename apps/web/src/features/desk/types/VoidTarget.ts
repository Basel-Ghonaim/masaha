import type { PAYMENT_METHODS } from '@masaha/shared/payments';

/** A payment the owner may void, as a page or a statement offers it: `who` is worded by the caller. */
export type VoidTarget = {
  id: number;
  amountAgorot: number;
  method: (typeof PAYMENT_METHODS)[number];
  receivedAt: string;
  /** The payment's customer, else its visitor, as the caller names them. */
  who: string;
};
