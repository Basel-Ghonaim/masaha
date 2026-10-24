import type { PaginationQuery } from '@masaha/shared/core';
import type {
  PaymentRow,
  PaymentsMeta,
  PaymentsQuery,
  UncollectedVisit,
} from '@masaha/shared/payments';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import type { PaymentsService } from './payments.service.ts';

export function createPaymentsController(service: PaymentsService) {
  return {
    /** 200 with a page of rows, `meta` its pagination and the totals of its whole filter. */
    list: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const query = req.query as unknown as PaymentsQuery;
      const { rows, total, totals } = await service.page({ id: userId, role }, spaceOf(req), query);
      const meta: PaymentsMeta = { ...buildPaginationMeta(query, total), totals };
      sendSuccess(res, rows satisfies PaymentRow[], { meta });
    },

    uncollected: async (req: Request, res: Response) => {
      const query = req.query as unknown as PaginationQuery;
      const { rows, total } = await service.uncollectedIn(spaceOf(req).id, query);
      sendSuccess(res, rows satisfies UncollectedVisit[], {
        meta: buildPaginationMeta(query, total),
      });
    },
  };
}

export type PaymentsController = ReturnType<typeof createPaymentsController>;
