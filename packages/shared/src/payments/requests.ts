import { z } from 'zod';

import { addDays, dateSchema, paginationQuerySchema, textSchema } from '../core/index.ts';

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

/** The payments list's filters: the item it settles, and its void. */
export const PAYMENT_KINDS = ['VISIT', 'SUBSCRIPTION'] as const;
export const PAYMENT_VOID_FILTERS = ['INCLUDE', 'EXCLUDE', 'ONLY'] as const;
/** The longest range of the payments list, in Gaza days, both ends included. */
export const PAYMENTS_RANGE_MAX_DAYS = 92;

/**
 * The payments list's query: a range of Gaza dates, `from` to `to`, both included, `to` not before
 * `from` and at most 92 days with both counted (both or neither; neither is today); who recorded it,
 * its method, its item's kind and its void (`INCLUDE` by default); paged.
 */
export const paymentsQuerySchema = paginationQuerySchema
  .extend({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    recordedById: z.coerce.number().int().positive().optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    kind: z.enum(PAYMENT_KINDS).optional(),
    voided: z.enum(PAYMENT_VOID_FILTERS).default('INCLUDE'),
  })
  .superRefine(({ from, to }, ctx) => {
    const issue = (path: string, code: string) => {
      ctx.addIssue({ code: 'custom', path: [path], params: { code } });
    };
    if (from === undefined && to !== undefined) issue('from', 'required');
    if (to === undefined && from !== undefined) issue('to', 'required');
    if (from !== undefined && to !== undefined) {
      if (to < from || to > addDays(from, PAYMENTS_RANGE_MAX_DAYS - 1)) issue('to', 'out_of_range');
    }
  });
export type PaymentsQuery = z.infer<typeof paymentsQuerySchema>;
