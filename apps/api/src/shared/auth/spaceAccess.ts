import type { RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import { parseId } from '../validation/index.ts';
import { can } from './can.ts';
import { signedIn } from './signedIn.ts';
import type { LinksLoader } from './spaceLinks.ts';

/**
 * The managed-space boundary (docs/backend/security.md › Authorization): it loads the space's links
 * and admits only a caller `can()` allows to read the space; anyone else is told it does not exist.
 */
export function requireSpaceAccess(loader: LinksLoader): RequestHandler {
  return async (req, _res, next) => {
    const id = parseId(req.params.spaceId);
    const { userId, role } = signedIn(req);
    const links = await loader(id);
    if (!can({ id: userId, role }, 'space.read', { links })) throw AppError.notFound();
    req.space = { id, links, linksUnder: (tx) => loader(id, tx) };
    next();
  };
}
