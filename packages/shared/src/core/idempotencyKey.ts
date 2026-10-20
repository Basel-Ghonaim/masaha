import { z } from 'zod';

// The idempotency key of a create at the front desk (docs/backend/conventions.md §13): the client's,
// one per user action, the same on every retry of it.

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** A key is a UUID. */
export const idempotencyKeySchema = z.uuid();
