import { z } from 'zod';

import { dateSchema, paginationQuerySchema, phoneSchema, textSchema } from '../core/index.ts';
import { CUSTOMER_NAME_MAX_LENGTH } from '../customers/index.ts';
import { createPackageSchema } from '../packages/index.ts';
import { paymentSchema } from '../payments/index.ts';
import { SUBSCRIPTION_STATUSES } from '../subscriptions/index.ts';
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
 * A payment at the desk, on exactly one item: a closed visit after its check-out, or a subscription
 * (neither: `required` on `visitId`, beside the body's other errors; both: `invalid_choice` on
 * `subscriptionId`). The phone, and the customer's name, when part of a visit's charge stays unpaid
 * on a visit with no customer.
 */
export const receivePaymentSchema = paymentSchema
  .extend({
    visitId: id.optional(),
    subscriptionId: id.optional(),
    phone: phoneSchema.optional(),
    customerName: textSchema(1, VISITOR_NAME_MAX_LENGTH).optional(),
  })
  .refine(({ visitId, subscriptionId }) => visitId !== undefined || subscriptionId !== undefined, {
    path: ['visitId'],
    params: { code: 'required' },
    // Also when another field is invalid, so a body naming no item says so at once.
    when: ({ value }) => typeof value === 'object' && value !== null,
  })
  .refine(({ visitId, subscriptionId }) => visitId === undefined || subscriptionId === undefined, {
    path: ['subscriptionId'],
    params: { code: 'invalid_choice' },
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

/** The customers list's status filter: their current subscription's status, or archived (the owner's). */
export const CUSTOMER_STATUS_FILTERS = [...SUBSCRIPTION_STATUSES, 'ARCHIVED'] as const;
/** The customers list's kind filter: their current subscription from a package, custom, or none. */
export const CUSTOMER_KINDS = ['PACKAGE', 'CUSTOM', 'NONE'] as const;
/** The customers list's payment filter: they owe, they are in credit, or neither. */
export const PAYMENT_FILTERS = ['OWES', 'CREDIT', 'SETTLED'] as const;

/**
 * The customers list's page and filters: a search of a name or a phone's last digits; their current
 * subscription's status, its kind and its package; their payment state. A package implies the kind
 * `PACKAGE`: with another kind it is `invalid_choice` on `kind`.
 */
export const customersQuerySchema = paginationQuerySchema
  .extend({
    q: textSchema(1, CUSTOMER_NAME_MAX_LENGTH).optional(),
    status: z.enum(CUSTOMER_STATUS_FILTERS).optional(),
    kind: z.enum(CUSTOMER_KINDS).optional(),
    packageId: z.coerce.number().int().positive().max(2_147_483_647).optional(),
    payment: z.enum(PAYMENT_FILTERS).optional(),
  })
  .refine(
    ({ packageId, kind }) => packageId === undefined || kind === undefined || kind === 'PACKAGE',
    { path: ['kind'], params: { code: 'invalid_choice' } },
  );
export type CustomersQuery = z.infer<typeof customersQuerySchema>;

/** The longest reason a price typed at the desk carries. */
export const PRICE_REASON_MAX_LENGTH = 200;

/**
 * A custom subscription's terms, typed at the desk: a package's terms with no validity, an optional
 * end date instead, and why the price was typed (data model › Hand-typed prices).
 */
const customTermsSchema = createPackageSchema.omit({ validityDays: true }).extend({
  endsOn: dateSchema.optional(),
  reason: textSchema(1, PRICE_REASON_MAX_LENGTH),
});

/**
 * Subscribes a customer: from a package of the space, or custom terms, exactly one of them (both or
 * neither: `invalid_choice` on `packageId`); a start date, else the server's; the subscription it
 * renews, if any; and a payment, which the server allocates over the customer's debts, oldest first.
 */
export const subscribeSchema = z
  .object({
    packageId: id.optional(),
    custom: customTermsSchema.optional(),
    startsOn: dateSchema.optional(),
    renewalOfId: id.optional(),
    payment: paymentSchema.optional(),
  })
  .refine(({ packageId, custom }) => (packageId === undefined) !== (custom === undefined), {
    path: ['packageId'],
    params: { code: 'invalid_choice' },
  });
export type SubscribeRequest = z.infer<typeof subscribeSchema>;
