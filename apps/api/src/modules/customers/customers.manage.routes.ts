import { createCustomerSchema, updateCustomerSchema } from '@masaha/shared/customers';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { requireIdempotencyKey } from '../../shared/http/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { CustomersController } from './customers.controller.ts';

/**
 * The customers' writes of one module, mounted below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization). Each asks `can()` here first, before its body is read
 * (the create then reads its idempotency key); the service asks `can()` again under the space's
 * lock. The list, the file and the archive span modules: they are the desk's.
 */
export function createCustomersManageRouter(controller: CustomersController): Router {
  const router = Router();
  const mayManage = requireCan('customers.manage');
  router.post(
    '/customers',
    mayManage,
    requireIdempotencyKey,
    validate(createCustomerSchema),
    controller.create,
  );
  router.patch(
    '/customers/:customerId',
    mayManage,
    validate(updateCustomerSchema),
    controller.edit,
  );
  return router;
}
