import { z } from 'zod';

import { textSchema } from '../core/index.ts';

// The requests that record a payment (docs/api/api-contract.md §5, Front desk (managed)).

/** How the desk received a payment. No money moves through Masaha (ADR 0010). */
export const PAYMENT_METHODS = ['CASH', 'TRANSFER'] as const;

/** ₪100,000: the largest payment, a guard against a slip of the keyboard. */
export const PAYMENT_MAX_AGOROT = 10_000_000;
export const PAYMENT_NOTE_MAX_LENGTH = 200;

/** A payment: whole agorot above zero, by cash or transfer, with an optional note. */
export const paymentSchema = z.object({
  amountAgorot: z.number().int().min(1).max(PAYMENT_MAX_AGOROT),
  method: z.enum(PAYMENT_METHODS),
  note: textSchema(1, PAYMENT_NOTE_MAX_LENGTH).optional(),
});
export type PaymentRequest = z.infer<typeof paymentSchema>;

export const VOID_REASON_MAX_LENGTH = 200;

/** The owner's void of a payment: why, required (ADR 0010 rule 4). */
export const voidPaymentSchema = z.object({
  reason: textSchema(1, VOID_REASON_MAX_LENGTH),
});
export type VoidPaymentRequest = z.infer<typeof voidPaymentSchema>;
