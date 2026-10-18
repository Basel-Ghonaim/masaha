import type {
  AddedStaff,
  AddStaffRequest,
  SetStaffActiveRequest,
  StaffMember,
} from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { StaffService } from './staff.service.ts';

export function createStaffController(service: StaffService) {
  return {
    list: async (req: Request, res: Response) => {
      const members = await service.list(spaceOf(req).id);
      sendSuccess(res, members satisfies StaffMember[]);
    },

    add: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const added = await service.add(
        { id: userId, role },
        spaceOf(req),
        req.body as AddStaffRequest,
      );
      // The temporary password is answered once: no cache keeps the answer.
      res.set('Cache-Control', 'no-store');
      sendSuccess(res, added satisfies AddedStaff, { status: 201 });
    },

    setActive: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const member = await service.setActive(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.userId),
        (req.body as SetStaffActiveRequest).isActive,
      );
      sendSuccess(res, member satisfies StaffMember);
    },
  };
}

export type StaffController = ReturnType<typeof createStaffController>;
