import { createSpaceSchema } from '@masaha/shared/spaces';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { SpaceController } from './space/space.controller.ts';

/**
 * The admin's spaces (docs/api/api-contract.md §5, Spaces (the admin)). The composition root mounts
 * it under /admin, behind requireAuth and requireRole('ADMIN'), so it carries no guard of its own.
 */
export function createSpacesAdminRouter({ space }: { space: SpaceController }): Router {
  const router = Router();
  router.post('/spaces', validate(createSpaceSchema), space.create);
  return router;
}
