import { z } from 'zod';

import { phoneSchema, textSchema } from '../core/index.ts';
import { paymentSchema } from '../payments/index.ts';
import { priceVisitSchema, VISITOR_NAME_MAX_LENGTH } from '../visits/index.ts';

// The requests of the front desk's orchestrations (docs/api/api-contract.md §5, Front desk
// (managed)).

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
  charge: priceVisitSchema.optional(),
});
export type CheckOutVisitRequest = z.infer<typeof checkOutVisitSchema>;

// The largest id an Int column holds.
const id = z.number().int().positive().max(2_147_483_647);

/**
 * A visit's payment after its check-out: the visit it pays, the payment, and the phone, and the
 * customer's name, when part of the charge stays unpaid on a visit with no customer.
 */
export const receivePaymentSchema = paymentSchema.extend({
  visitId: id,
  phone: phoneSchema.optional(),
  customerName: textSchema(1, VISITOR_NAME_MAX_LENGTH).optional(),
});
export type ReceivePaymentRequest = z.infer<typeof receivePaymentSchema>;

/**
 * «تسجيل دينًا»: a closed visit's unpaid rest left to the customer with this phone, found or
 * created with this name (else the visit's), with no payment.
 */
export const leaveToCustomerSchema = z.object({
  phone: phoneSchema,
  customerName: textSchema(1, VISITOR_NAME_MAX_LENGTH).optional(),
});
export type LeaveToCustomerRequest = z.infer<typeof leaveToCustomerSchema>;
