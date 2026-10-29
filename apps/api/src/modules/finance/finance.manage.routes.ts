import { debtsQuerySchema, financeMonthQuery, payersQuerySchema } from '@masaha/shared/finance';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { FinanceController } from './finance.controller.ts';

/**
 * The owner's finance, mounted at `/finance` below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization): the owner's alone, so `can()` refuses reception
 * before the query is read.
 */
export function createFinanceManageRouter(controller: FinanceController): Router {
  const router = Router();
  router.get(
    '/income',
    requireCan('finance.read'),
    validate(financeMonthQuery, 'query'),
    controller.income,
  );
  router.get(
    '/debts',
    requireCan('finance.read'),
    validate(debtsQuerySchema, 'query'),
    controller.debts,
  );
  router.get(
    '/payers',
    requireCan('finance.read'),
    validate(payersQuerySchema, 'query'),
    controller.payers,
  );
  router.get(
    '/occupancy',
    requireCan('finance.read'),
    validate(financeMonthQuery, 'query'),
    controller.occupancy,
  );
  return router;
}
