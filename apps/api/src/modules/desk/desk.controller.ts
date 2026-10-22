import type { Customer } from '@masaha/shared/customers';
import type {
  CheckOutVisitRequest,
  CustomerFile,
  CustomerRow,
  CustomersQuery,
  LeaveToCustomerRequest,
  NewSubscription,
  ReceivedPayment,
  ReceivePaymentRequest,
  SubscribeRequest,
  SubscriptionStatement,
  VisitCheckOut,
} from '@masaha/shared/desk';
import type { CheckInSubscriberRequest, DeskCheckIn } from '@masaha/shared/subscriptions';
import type { CheckInVisitRequest, DeskVisit, WriteOffVisitRequest } from '@masaha/shared/visits';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, idempotencyKeyOf, sendSuccess } from '../../shared/http/index.ts';
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

    /** 201 every time, a retry included; the warnings in `meta` only when there are some. */
    checkInSubscriber: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const { checkIn, warnings } = await service.checkInSubscriber(
        { id: userId, role },
        spaceOf(req),
        idempotencyKeyOf(res),
        req.body as CheckInSubscriberRequest,
      );
      sendSuccess(res, checkIn satisfies DeskCheckIn, {
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

    /** 200 with the visit; the same phone again answers it as it is. */
    leaveToCustomer: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const visit = await service.leaveToCustomer(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.visitId),
        req.body as LeaveToCustomerRequest,
      );
      sendSuccess(res, visit satisfies DeskVisit);
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

    /** 200 with a page of rows and its `meta`. */
    customers: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const query = req.query as unknown as CustomersQuery;
      const { rows, total } = await service.customers({ id: userId, role }, spaceOf(req), query);
      sendSuccess(res, rows satisfies CustomerRow[], { meta: buildPaginationMeta(query, total) });
    },

    customerFile: async (req: Request, res: Response) => {
      const customerFile = await service.customerFile(spaceOf(req), parseId(req.params.customerId));
      sendSuccess(res, customerFile satisfies CustomerFile);
    },

    /** 201 every time, a retry included; the warnings in `meta` only when there are some. */
    subscribe: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const { result, warnings } = await service.subscribe(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.customerId),
        idempotencyKeyOf(res),
        req.body as SubscribeRequest,
      );
      sendSuccess(res, result satisfies NewSubscription, {
        status: 201,
        ...(warnings.length > 0 && { meta: { warnings } }),
      });
    },

    statement: async (req: Request, res: Response) => {
      const statement = await service.statement(spaceOf(req), parseId(req.params.subscriptionId));
      sendSuccess(res, statement satisfies SubscriptionStatement);
    },

    /** 200 with the customer; one already archived is answered as it is. */
    archiveCustomer: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const customer = await service.archiveCustomer(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.customerId),
      );
      sendSuccess(res, customer satisfies Customer);
    },
  };
}

export type DeskController = ReturnType<typeof createDeskController>;
