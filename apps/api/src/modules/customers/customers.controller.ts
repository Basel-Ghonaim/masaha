import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '@masaha/shared/customers';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { idempotencyKeyOf, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { CustomersService } from './customers.service.ts';

export function createCustomersController(service: CustomersService) {
  return {
    /** 201 every time, a retry included, with the customer as it is now. */
    create: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const created = await service.create(
        { id: userId, role },
        spaceOf(req),
        idempotencyKeyOf(res),
        req.body as CreateCustomerRequest,
      );
      sendSuccess(res, created satisfies Customer, { status: 201 });
    },

    edit: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const edited = await service.edit(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.customerId),
        req.body as UpdateCustomerRequest,
      );
      sendSuccess(res, edited satisfies Customer);
    },

    /** 200 with the customer; one not archived is answered as it is. */
    restore: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const restored = await service.restore(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.customerId),
      );
      sendSuccess(res, restored satisfies Customer);
    },
  };
}

export type CustomersController = ReturnType<typeof createCustomersController>;
