import type {
  CorrectPriceRequest,
  CorrectSubscriptionRequest,
  SubscriptionState,
} from '@masaha/shared/subscriptions';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { SubscriptionsService } from './subscriptions.service.ts';

export function createSubscriptionsController(service: SubscriptionsService) {
  return {
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
