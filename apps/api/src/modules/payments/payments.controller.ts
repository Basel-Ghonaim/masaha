import type { PaginationQuery } from '@masaha/shared/core';
import type { UncollectedVisit } from '@masaha/shared/payments';
import type { Request, Response } from 'express';

import { spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import type { PaymentsService } from './payments.service.ts';

export function createPaymentsController(service: PaymentsService) {
  return {
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
