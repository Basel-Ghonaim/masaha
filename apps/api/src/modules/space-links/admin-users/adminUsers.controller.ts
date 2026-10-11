import type { AdminUserRow, AdminUsersQuery } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { buildPaginationMeta, sendSuccess } from '../../../shared/http/index.ts';
import type { AdminUsersService } from './adminUsers.service.ts';

export function createAdminUsersController(adminUsers: AdminUsersService) {
  return {
    list: async (req: Request, res: Response) => {
      const query = req.query as unknown as AdminUsersQuery;
      const { rows, total } = await adminUsers.list(query);
      sendSuccess(res, rows satisfies AdminUserRow[], { meta: buildPaginationMeta(query, total) });
    },
  };
}

export type AdminUsersController = ReturnType<typeof createAdminUsersController>;
