import type { CreateReportRequest, MyReport } from '@masaha/shared/data-reports';
import type { Request, Response } from 'express';

import { signedIn } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { DataReportsService } from './data-reports.service.ts';

export function createDataReportsController(service: DataReportsService) {
  return {
    /** 201 with the new report; 200 with the user's open one of that field, which it repeats. */
    create: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const { report, created } = await service.create(
        { id: userId, role },
        String(req.params.slug),
        req.body as CreateReportRequest,
      );
      sendSuccess(res, report satisfies MyReport, { status: created ? 201 : 200 });
    },
  };
}

export type DataReportsController = ReturnType<typeof createDataReportsController>;
