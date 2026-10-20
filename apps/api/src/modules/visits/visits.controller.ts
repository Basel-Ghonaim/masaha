import type { QuotedVisit, VisitTerms } from '@masaha/shared/visits';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { VisitsService } from './visits.service.ts';

export function createVisitsController(service: VisitsService) {
  return {
    quote: async (req: Request, res: Response) => {
      const visit = await service.quote(spaceOf(req).id, parseId(req.params.visitId));
      sendSuccess(res, visit satisfies QuotedVisit);
    },

    terms: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const terms = await service.terms({ id: userId, role }, spaceOf(req));
      sendSuccess(res, terms satisfies VisitTerms);
    },
  };
}

export type VisitsController = ReturnType<typeof createVisitsController>;
