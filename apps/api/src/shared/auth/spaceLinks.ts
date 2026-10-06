import type { Request, RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import { parseId } from '../validation/index.ts';
import type { SpaceLink, SpaceResource } from './can.ts';

/** The space a route names, with its links: what `can()` reads of it. */
export interface LoadedSpace extends SpaceResource {
  readonly id: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** The space of the route's `:spaceId`, with its links, set by the links loader. */
    space?: LoadedSpace;
  }
}

/** Every link to the space, deactivated ones included, read from the database. */
export type LinksLoader = (spaceId: number) => Promise<readonly SpaceLink[]>;

/**
 * The links loader without the refusal (docs/backend/conventions.md §8, Space access): it puts the
 * route's space and its links on the request, so `can()` knows the caller's role there and whether
 * the space is verified, and refuses no one. The composition root mounts it on the admin's space
 * routes. A `:spaceId` that names no row is `not_found`, as an unknown id is.
 */
export function loadSpaceLinks(loader: LinksLoader): RequestHandler {
  return async (req, _res, next) => {
    const id = parseId(req.params.spaceId);
    req.space = { id, links: await loader(id) };
    next();
  };
}

/** The route's space, which the links loader put on the request; 404 when it did not run. */
export function spaceOf(req: Request): LoadedSpace {
  if (!req.space) throw AppError.notFound();
  return req.space;
}
