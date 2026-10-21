import { z } from 'zod';

import { phoneSchema, textSchema } from '../core/index.ts';

// The requests of the managed customers endpoints (docs/api/api-contract.md §5, Customers (managed)).

export const CUSTOMER_NAME_MAX_LENGTH = 60;

const name = textSchema(1, CUSTOMER_NAME_MAX_LENGTH);

/** A new customer of the space: a name, and a phone when they give one, stored in E.164. */
export const createCustomerSchema = z.object({ name, phone: phoneSchema.optional() });
export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;

/**
 * Edits a customer: the name, the phone, or both; what is absent is kept, and `null` clears the
 * phone.
 */
export const updateCustomerSchema = z.object({ name, phone: phoneSchema.nullable() }).partial();
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;
