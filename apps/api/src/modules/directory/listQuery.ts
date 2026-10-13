import { directoryQuerySchema, NEAR_HEADER, type DirectoryQuery } from '@masaha/shared/directory';
import type { RequestHandler, Response } from 'express';

import { toValidationError } from '../../shared/validation/index.ts';
import { cachePrivately } from './cache.ts';

/**
 * Validates the list's query together with the `Masaha-Near` header, as one input whose point is
 * `near`, against the shared schema. The parsed query is kept on the response's locals, never on
 * the request, so nothing the request logger writes holds the point (docs/backend/security.md ›
 * Location); the header itself is redacted there.
 */
export const validateListQuery: RequestHandler = (req, res, next) => {
  const near = req.get(NEAR_HEADER);
  // Before anything can refuse the request: no answer to one that carries the point is kept, a
  // refusal or a failure included.
  if (near !== undefined) cachePrivately(res);
  const input = { ...req.query, near };
  const result = directoryQuerySchema.safeParse(input);
  if (!result.success) throw toValidationError(result.error.issues, input);
  res.locals.directoryQuery = result.data;
  next();
};

/** The list's query, as `validateListQuery` parsed it. */
export function listQueryOf(res: Response): DirectoryQuery {
  return res.locals.directoryQuery as DirectoryQuery;
}
