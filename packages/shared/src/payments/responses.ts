import type { DeskVisit } from '../visits/index.ts';
import type { PAYMENT_METHODS } from './requests.ts';

// The answers that carry a payment (docs/api/api-contract.md §5, Front desk (managed)).

/** A payment of a visit, as recorded. */
export interface VisitPayment {
  id: number;
  amountAgorot: number;
  method: (typeof PAYMENT_METHODS)[number];
  note: string | null;
  receivedAt: string;
  recordedById: number;
}

/** A payment of an item as a statement shows it: voided ones too, with when, by whom and why. */
export type ItemPayment = VisitPayment & {
  voided: { at: string; byId: number; reason: string } | null;
};

/**
 * A customer's money at a space (data model › Customer debt): the sum of what their items still owe,
 * and what a usage-based subscription holds paid ahead; one never offsets the other.
 */
export interface CustomerBalance {
  debtAgorot: number;
  creditAgorot: number;
}

/**
 * A visit closed by the auto check-out and not fully paid: the visit, what was paid on it, and what
 * is still owed, `null` while it has no charge (unpriced).
 */
export interface UncollectedVisit {
  visit: DeskVisit;
  paidAgorot: number;
  balanceAgorot: number | null;
}

/** The item a payment settles, named: a visit by its visitor's name, a subscription by its own. */
export type PaymentItem =
  | { kind: 'VISIT'; id: number; visitorName: string | null }
  | { kind: 'SUBSCRIPTION'; id: number; name: string };

/**
 * A payment as the payments list shows it, and as its void answers it: its item, the item's customer
 * (a visit's, or a subscription's), who recorded it, and its void (when, by whom, why) once voided.
 */
export interface PaymentRow {
  id: number;
  amountAgorot: number;
  method: (typeof PAYMENT_METHODS)[number];
  note: string | null;
  receivedAt: string;
  item: PaymentItem;
  customer: { id: number; name: string } | null;
  recordedBy: { id: number; name: string };
  voided: { at: string; by: { id: number; name: string }; reason: string } | null;
}
