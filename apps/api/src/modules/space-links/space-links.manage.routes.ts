import { addStaffSchema } from '@masaha/shared/space-links';
import { Router } from 'express';

import { requireCan, signedIn } from '../../shared/auth/index.ts';
import { limitRequests, type Limiter } from '../../shared/rate-limit/index.ts';
import { validate } from '../../shared/validation/index.ts';
import { STAFF_ACCOUNT } from './space-links.limits.ts';
import type { StaffController } from './staff/staff.controller.ts';

/**
 * The owner's staff router, mounted below `/manage/spaces/:spaceId`, behind that boundary: without
 * an active link at the live space, the caller never reaches it (docs/backend/security.md ›
 * Authorization). Every route asks `can('staff.manage')` first, so reception is refused before a
 * body is read or a request counted; the writes ask it again under the space's lock.
 */
export function createStaffManageRouter({
  staff,
  limiter,
}: {
  staff: StaffController;
  limiter: Limiter;
}): Router {
  const router = Router();
  const mayManage = requireCan('staff.manage');
  const counted = limitRequests(limiter, (req) =>
    Promise.resolve({ policy: STAFF_ACCOUNT, by: [String(signedIn(req).userId)] }),
  );
  router.get('/', mayManage, staff.list);
  router.post('/', mayManage, counted, validate(addStaffSchema), staff.add);
  return router;
}
