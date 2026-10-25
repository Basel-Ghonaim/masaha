import {
  directoryQuerySchema,
  favoritesQuerySchema,
  NEAR_HEADER,
  type DirectoryQuery,
  type FavoritesQuery,
} from '@masaha/shared/directory';
import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

import { toValidationError } from '../../shared/validation/index.ts';
import { cachePrivately } from './cache.ts';

// The parsed query is kept on the response's locals, never on the request, so nothing the request
// logger writes holds the point (docs/backend/security.md › Location); the header itself is
// redacted there.

/**
 * No answer to a request that carries the `Masaha-Near` header is kept, a refusal or a failure
 * included: called before anything can refuse the request.
 */
function keepPrivateIfNear(req: Request, res: Response): string | undefined {
  const near = req.get(NEAR_HEADER);
  if (near !== undefined) cachePrivately(res);
  return near;
}

/** The query together with the `Masaha-Near` header, as one input whose point is `near`. */
function parseWithNear<Schema extends z.ZodType>(
  schema: Schema,
  req: Request,
  res: Response,
): z.output<Schema> {
  const input = { ...req.query, near: keepPrivateIfNear(req, res) };
  const result = schema.safeParse(input);
  if (!result.success) throw toValidationError(result.error.issues, input);
  return result.data;
}

/** Marks the answer `no-store` when the request carries the point, before its guard can refuse it. */
export const keepNearPrivate: RequestHandler = (req, res, next) => {
  keepPrivateIfNear(req, res);
  next();
};

/** Validates the list's query together with the `Masaha-Near` header, against the shared schema. */
export const validateListQuery: RequestHandler = (req, res, next) => {
  res.locals.directoryQuery = parseWithNear(directoryQuerySchema, req, res);
  next();
};

/** The list's query, as `validateListQuery` parsed it. */
export function listQueryOf(res: Response): DirectoryQuery {
  return res.locals.directoryQuery as DirectoryQuery;
}

/** Validates the favourites' query together with the `Masaha-Near` header, by the list's rule. */
export const validateFavoritesQuery: RequestHandler = (req, res, next) => {
  res.locals.favoritesQuery = parseWithNear(favoritesQuerySchema, req, res);
  next();
};

/** The favourites' query, as `validateFavoritesQuery` parsed it. */
export function favoritesQueryOf(res: Response): FavoritesQuery {
  return res.locals.favoritesQuery as FavoritesQuery;
}
