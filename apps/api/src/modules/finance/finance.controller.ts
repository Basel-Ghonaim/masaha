import type { FinanceMonthQuery, IncomeReport } from '@masaha/shared/finance';
import type { Request, Response } from 'express';

import { spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { FinanceService } from './finance.service.ts';

export function createFinanceController(service: FinanceService) {
  return {
    /** 200 with the month's `IncomeReport`. */
    income: async (req: Request, res: Response) => {
      const query = req.query as unknown as FinanceMonthQuery;
      sendSuccess(res, (await service.income(spaceOf(req).id, query)) satisfies IncomeReport);
    },
  };
}

export type FinanceController = ReturnType<typeof createFinanceController>;
