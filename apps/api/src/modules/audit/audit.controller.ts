import type { AuditEntry, AuditMeta, SpaceAuditQuery } from '@masaha/shared/audit';
import type { Request, Response } from 'express';

import { spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import type { AuditService } from './audit.service.ts';

export function createAuditController(service: AuditService) {
  return {
    /** 200 with a page of the space's log and its `meta`, with the period's actors. */
    spaceLog: async (req: Request, res: Response) => {
      const query = req.query as unknown as SpaceAuditQuery;
      const { rows, total, actors } = await service.spaceLog(spaceOf(req).id, query);
      const meta: AuditMeta = { ...buildPaginationMeta(query, total), actors };
      sendSuccess(res, rows satisfies AuditEntry[], { meta });
    },
  };
}

export type AuditController = ReturnType<typeof createAuditController>;
