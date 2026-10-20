import { IDEMPOTENCY_KEY_HEADER, idempotencyKeySchema } from '@masaha/shared/core';
import type { RequestHandler, Response } from 'express';

import { AppError } from '../errors/index.ts';

/**
 * Reads a create's idempotency key from its `Idempotency-Key` header (docs/backend/conventions.md
 * §13), before the body is read: missing, `required`; not a UUID, `invalid_format`, both on the
 * field `idempotencyKey`. The key is kept on the response's locals.
 */
export const requireIdempotencyKey: RequestHandler = (req, res, next) => {
  const header = req.get(IDEMPOTENCY_KEY_HEADER);
  if (header === undefined) throw AppError.validation({ idempotencyKey: ['required'] });
  const key = idempotencyKeySchema.safeParse(header);
  if (!key.success) throw AppError.validation({ idempotencyKey: ['invalid_format'] });
  res.locals.idempotencyKey = key.data;
  next();
};

/** The request's idempotency key, as `requireIdempotencyKey` read it. */
export function idempotencyKeyOf(res: Response): string {
  return res.locals.idempotencyKey as string;
}
