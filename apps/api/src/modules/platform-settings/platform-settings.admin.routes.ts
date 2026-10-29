import { platformContactSchema, stalenessSchema } from '@masaha/shared/platform-settings';
import { newSpaceDefaultsSchema } from '@masaha/shared/space-settings';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { PlatformSettingsController } from './platform-settings.controller.ts';

/**
 * The platform's settings, mounted at `/settings` inside `/admin`, behind `requireRole('ADMIN')`
 * (docs/backend/security.md › Authorization): one resource per card of the admin's settings page,
 * each read and saved whole on its own.
 */
export function createPlatformSettingsAdminRouter(controller: PlatformSettingsController): Router {
  const router = Router();
  router.get('/new-space-defaults', controller.newSpaceDefaults);
  router.put(
    '/new-space-defaults',
    validate(newSpaceDefaultsSchema),
    controller.saveNewSpaceDefaults,
  );
  router.get('/staleness', controller.staleness);
  router.put('/staleness', validate(stalenessSchema), controller.saveStaleness);
  router.get('/contact', controller.contact);
  router.put('/contact', validate(platformContactSchema), controller.saveContact);
  return router;
}
