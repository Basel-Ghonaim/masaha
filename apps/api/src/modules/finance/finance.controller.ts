import type {
  BalanceRow,
  DebtsMeta,
  DebtsQuery,
  FinanceMonthQuery,
  IncomeReport,
  OccupancyReport,
  Payer,
  PayersQuery,
} from '@masaha/shared/finance';
import type { Request, Response } from 'express';

import { spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import type { FinanceService } from './finance.service.ts';

export function createFinanceController(service: FinanceService) {
  return {
    /** 200 with the month's `IncomeReport`. */
    income: async (req: Request, res: Response) => {
      const query = req.query as unknown as FinanceMonthQuery;
      sendSuccess(res, (await service.income(spaceOf(req).id, query)) satisfies IncomeReport);
    },

    /** 200 with a page of `BalanceRow` and its `DebtsMeta`: the totals and the reminder template. */
    debts: async (req: Request, res: Response) => {
      const query = req.query as unknown as DebtsQuery;
      const { rows, total, meta } = await service.debts(spaceOf(req).id, query);
      const debtsMeta: DebtsMeta = { ...buildPaginationMeta(query, total), ...meta };
      sendSuccess(res, rows satisfies BalanceRow[], { meta: debtsMeta });
    },

    /** 200 with a page of the month's `Payer` and its pagination. */
    payers: async (req: Request, res: Response) => {
      const query = req.query as unknown as PayersQuery;
      const { rows, total } = await service.payers(spaceOf(req).id, query);
      sendSuccess(res, rows satisfies Payer[], { meta: buildPaginationMeta(query, total) });
    },

    /** 200 with the month's `OccupancyReport`. */
    occupancy: async (req: Request, res: Response) => {
      const query = req.query as unknown as FinanceMonthQuery;
      const report = await service.occupancy(spaceOf(req).id, query);
      sendSuccess(res, report satisfies OccupancyReport);
    },
  };
}

export type FinanceController = ReturnType<typeof createFinanceController>;
