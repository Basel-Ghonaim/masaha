import type { PAYMENT_METHODS } from '@masaha/shared/payments';

/** A payment as the ledger's row and «دفعاتي اليوم»'s show it, every value worded. */
export type PaymentRowView = {
  key: string;
  /** The day it was received: «اليوم», «أمس», else the date, on Gaza's calendar. */
  day: string;
  /** The time it was received, `HH:MM` on Gaza's clock. */
  time: string;
  /** The customer, else the visitor, else «زائر», in its own direction. */
  who: string;
  /** The customer's id, for a link to their file; none for a visit with no customer. */
  customerId: number | null;
  /** What it paid: «زيارة», or the subscription's name. */
  item: string;
  amount: string;
  method: string;
  /** Who recorded it. */
  recorder: string;
  /** A voided payment's badge and «ألغاها {name}: {reason}»; never counted as received. */
  voided: { label: string; line: string } | null;
  /** The payment, for the row's slot: the owner's void of one not voided. */
  payment: LedgerPayment;
};

/** A payment as the ledger hands it to its row's slot. */
export type LedgerPayment = {
  id: number;
  amountAgorot: number;
  method: (typeof PAYMENT_METHODS)[number];
  receivedAt: string;
  /** The customer, else the visitor, else «زائر». */
  who: string;
  voided: boolean;
};
