import type { RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import { parseId } from '../validation/index.ts';
import { signedIn } from './signedIn.ts';
import type { LinksLoader } from './spaceLinks.ts';
import type { LoadedSpace } from './spaceLinks.ts';

/** Loads a live space and admits only callers with an active OWNER or RECEPTION link. */
export function requireSpaceAccess(loader: LinksLoader): RequestHandler {
  return async (req, _res, next) => {
    const id = parseId(req.params.spaceId);
    const links = await loader(id);
    const { userId } = signedIn(req);
    if (!links.some((link) => link.userId === userId && link.deactivatedAt === null)) {
      throw AppError.notFound();
    }

    const space: LoadedSpace = {
      id,
      links,
      linksUnder: (tx) => loader(id, tx),
    };
    req.space = space;
    next();
  };
}
