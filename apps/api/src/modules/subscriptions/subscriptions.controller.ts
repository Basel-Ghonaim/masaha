import type {
  CheckInsQuery,
  CorrectPriceRequest,
  CorrectSubscriptionRequest,
  DeskCheckIn,
  SubscriptionState,
} from '@masaha/shared/subscriptions';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { SubscriptionsService } from './subscriptions.service.ts';

export function createSubscriptionsController(service: SubscriptionsService) {
  return {
    /** 200: the open check-ins whole, with no `meta`; or a page of a date range, with its `meta`. */
    checkIns: async (req: Request, res: Response) => {
      const query = req.query as unknown as CheckInsQuery;
      const { rows, total } = await service.checkInsIn(spaceOf(req).id, query);
      sendSuccess(
        res,
        rows satisfies DeskCheckIn[],
        total === null ? undefined : { meta: buildPaginationMeta(query, total) },
      );
    },

    /** 200 with the subscription's state; a correction that changes nothing answers it as it is. */
    correct: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const state = await service.correct(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.subscriptionId),
        req.body as CorrectSubscriptionRequest,
      );
      sendSuccess(res, state satisfies SubscriptionState);
    },

    /** 200 with the subscription's state; one already ended is answered as it is. */
    end: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const state = await service.end(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.subscriptionId),
      );
      sendSuccess(res, state satisfies SubscriptionState);
    },

    /** 200 with the subscription's state; the same price and billing answer it as it is. */
    correctPrice: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const state = await service.correctPrice(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.subscriptionId),
        req.body as CorrectPriceRequest,
      );
      sendSuccess(res, state satisfies SubscriptionState);
    },
  };
}

export type SubscriptionsController = ReturnType<typeof createSubscriptionsController>;
