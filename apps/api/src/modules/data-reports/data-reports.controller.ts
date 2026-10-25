import type {
  AdminReport,
  AdminReportsQuery,
  CreateReportRequest,
  DecideReportRequest,
  MyReport,
  MyReportsQuery,
  SpaceReport,
  SpaceReportsQuery,
} from '@masaha/shared/data-reports';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
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

    /** 200 with a page of the user's own reports and its `meta`. */
    mine: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const query = req.query as unknown as MyReportsQuery;
      const { rows, total } = await service.mine({ id: userId, role }, query);
      sendSuccess(res, rows satisfies MyReport[], { meta: buildPaginationMeta(query, total) });
    },

    /** 200 with a page of the space's reports and its `meta`: never who reported them. */
    ofSpace: async (req: Request, res: Response) => {
      const query = req.query as unknown as SpaceReportsQuery;
      const { rows, total } = await service.ofSpace(spaceOf(req).id, query);
      sendSuccess(res, rows satisfies SpaceReport[], { meta: buildPaginationMeta(query, total) });
    },

    /** 200 with a page of every report and its `meta`, with who reported and who decided. */
    all: async (req: Request, res: Response) => {
      const query = req.query as unknown as AdminReportsQuery;
      const { rows, total } = await service.all(query);
      sendSuccess(res, rows satisfies AdminReport[], { meta: buildPaginationMeta(query, total) });
    },

    /** 200 with the report as the admin decided it, or as it was for the same decision again. */
    decideAsAdmin: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const decided = await service.decideAsAdmin(
        { id: userId, role },
        parseId(req.params.reportId),
        req.body as DecideReportRequest,
      );
      sendSuccess(res, decided satisfies AdminReport);
    },

    /** 200 with the report as decided now, or as it was for the same decision again. */
    decideAtSpace: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const decided = await service.decideAtSpace(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.reportId),
        req.body as DecideReportRequest,
      );
      sendSuccess(res, decided satisfies SpaceReport);
    },
  };
}

export type DataReportsController = ReturnType<typeof createDataReportsController>;
