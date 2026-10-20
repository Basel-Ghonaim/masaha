import { z } from 'zod';

import { phoneSchema, textSchema } from '../core/index.ts';
import { paymentSchema, PAYMENT_MAX_AGOROT } from '../payments/index.ts';
import { VISITOR_NAME_MAX_LENGTH } from '../visits/index.ts';

// The requests of the front desk's orchestrations (docs/api/api-contract.md §5, Front desk
// (managed)).

export const CHARGE_REASON_MAX_LENGTH = 200;

/**
 * Checks a visit out: the time of the quote the desk showed (absent: now); the payment taken, if
 * any; the phone, and the customer's name, when part of the charge stays unpaid; and the charge
 * typed by hand, with its reason, where the visit has no rate.
 */
export const checkOutVisitSchema = z.object({
  checkedOutAt: z.iso.datetime({ offset: true }).optional(),
  payment: paymentSchema.nullable().optional(),
  phone: phoneSchema.optional(),
  customerName: textSchema(1, VISITOR_NAME_MAX_LENGTH).optional(),
  charge: z
    .object({
      amountAgorot: z.number().int().min(1).max(PAYMENT_MAX_AGOROT),
      reason: textSchema(1, CHARGE_REASON_MAX_LENGTH),
    })
    .optional(),
});
export type CheckOutVisitRequest = z.infer<typeof checkOutVisitSchema>;
