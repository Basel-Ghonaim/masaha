import type { ChangeRoleRequest } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { signedIn } from '../../../shared/auth/index.ts';
import { sendNoContent } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { AdminRolesService } from './adminRoles.service.ts';

export function createAdminRolesController(roles: AdminRolesService) {
  return {
    change: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const { role } = req.body as ChangeRoleRequest;
      await roles.change(userId, parseId(req.params.userId), role);
      sendNoContent(res);
    },
  };
}

export type AdminRolesController = ReturnType<typeof createAdminRolesController>;
