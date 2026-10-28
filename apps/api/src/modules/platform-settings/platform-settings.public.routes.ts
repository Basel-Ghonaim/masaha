import { Router } from 'express';

import type { PlatformSettingsController } from './platform-settings.controller.ts';

/**
 * The platform's public settings, at `/settings` (docs/api/api-contract.md › Platform settings): no
 * guard. Only the contact, which the site shows.
 */
export function createPlatformSettingsPublicRouter(controller: PlatformSettingsController): Router {
  const router = Router();
  router.get('/public', controller.publicContact);
  return router;
}
