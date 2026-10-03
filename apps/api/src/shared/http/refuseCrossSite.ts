import type { RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';

/**
 * Refuses a request another site made the browser send, before it touches anything. The session
 * cookies are SameSite=Strict, so such a request carries none, but an answer that clears them
 * would still sign the user out (docs/backend/security.md › Tokens and cookies). A request the
 * browser marks cross-site, or whose Origin is not the web's, is refused; one with neither header
 * (not from a browser) passes.
 */
export function refuseCrossSite(webOrigin: string): RequestHandler {
  return (req, _res, next) => {
    const site = req.get('sec-fetch-site');
    const origin = req.get('origin');
    if ((site && site !== 'same-origin' && site !== 'none') || (origin && origin !== webOrigin)) {
      throw AppError.forbidden(undefined, 'Cross-site request refused');
    }
    next();
  };
}
