import type {
  CheckOutVisitRequest,
  ReceivedPayment,
  ReceivePaymentRequest,
  VisitCheckOut,
} from '@masaha/shared/desk';
import type { CheckInVisitRequest, DeskVisit, WriteOffVisitRequest } from '@masaha/shared/visits';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { idempotencyKeyOf, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { DeskService } from './desk.service.ts';

export function createDeskController(service: DeskService) {
  return {
    /** 201 every time, a retry included; the warnings in `meta` only when there are some. */
    checkInVisit: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const { visit, warnings } = await service.checkInVisit(
        { id: userId, role },
        spaceOf(req),
        idempotencyKeyOf(res),
        req.body as CheckInVisitRequest,
      );
      sendSuccess(res, visit satisfies DeskVisit, {
        status: 201,
        ...(warnings.length > 0 && { meta: { warnings } }),
      });
    },

    /** 200, a retry included, with the first result. */
    checkOutVisit: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const checkOut = await service.checkOutVisit(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.visitId),
        idempotencyKeyOf(res),
        req.body as CheckOutVisitRequest,
      );
      sendSuccess(res, checkOut satisfies VisitCheckOut);
    },

    /** 201 every time, a retry included, with the first payment and the sums as of now. */
    receivePayment: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const received = await service.receivePayment(
        { id: userId, role },
        spaceOf(req),
        idempotencyKeyOf(res),
        req.body as ReceivePaymentRequest,
      );
      sendSuccess(res, received satisfies ReceivedPayment, { status: 201 });
    },

    /** 200 with the visit; a second write-off answers it as it is. */
    writeOffVisit: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const visit = await service.writeOffVisit(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.visitId),
        req.body as WriteOffVisitRequest,
      );
      sendSuccess(res, visit satisfies DeskVisit);
    },

    /** 200 with the visit; one not written off is answered as it is. */
    undoWriteOff: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const visit = await service.undoWriteOff(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.visitId),
      );
      sendSuccess(res, visit satisfies DeskVisit);
    },
  };
}

export type DeskController = ReturnType<typeof createDeskController>;
