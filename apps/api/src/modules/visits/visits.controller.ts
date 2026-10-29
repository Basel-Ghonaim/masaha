import type { PaginationQuery } from '@masaha/shared/core';
import type {
  DeskVisit,
  PriceVisitRequest,
  QuotedVisit,
  VisitsQuery,
  VisitTerms,
} from '@masaha/shared/visits';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { VisitsService } from './visits.service.ts';

export function createVisitsController(service: VisitsService) {
  return {
    list: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const query = req.query as unknown as VisitsQuery;
      const { rows, total } = await service.page({ id: userId, role }, spaceOf(req), query);
      sendSuccess(res, rows satisfies DeskVisit[], { meta: buildPaginationMeta(query, total) });
    },

    quote: async (req: Request, res: Response) => {
      const visit = await service.quote(spaceOf(req).id, parseId(req.params.visitId));
      sendSuccess(res, visit satisfies QuotedVisit);
    },

    terms: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const terms = await service.terms({ id: userId, role }, spaceOf(req));
      sendSuccess(res, terms satisfies VisitTerms);
    },

    unpriced: async (req: Request, res: Response) => {
      const query = req.query as unknown as PaginationQuery;
      const { rows, total } = await service.unpricedIn(spaceOf(req).id, query);
      sendSuccess(res, rows satisfies DeskVisit[], { meta: buildPaginationMeta(query, total) });
    },

    price: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const visit = await service.price(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.visitId),
        req.body as PriceVisitRequest,
      );
      sendSuccess(res, visit satisfies DeskVisit);
    },
  };
}

export type VisitsController = ReturnType<typeof createVisitsController>;
