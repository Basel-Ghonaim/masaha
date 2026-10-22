import { createHash } from 'node:crypto';

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

/**
 * The key of the `index`-th record one request makes under `key` (a renewal's payments, one per item
 * it pays, conventions §13): the SHA-256 of `key/index`, formatted as a UUID (version 8, RFC 9562's
 * custom one). The same request derives the same keys, so a retry finds each record it made.
 */
export function derivedKey(key: string, index: number): string {
  const hex = createHash('sha256')
    .update(`${key}/${String(index)}`)
    .digest('hex');
  const variant = ((parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `8${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
