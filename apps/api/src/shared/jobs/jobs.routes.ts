import { Router, type Request, type Response } from 'express';

import { AppError } from '../errors/index.ts';
import { sendSuccess } from '../http/index.ts';
import type { Jobs } from './jobs.ts';
import { matchesSecret } from './secret.ts';

/**
 * The internal endpoint an external cron calls online (docs/api/api-contract.md › Internal):
 * `POST /run`, with `Authorization: Bearer <JOBS_SECRET>`. A missing or wrong secret is
 * `unauthorized` and runs nothing; a run where a job itself threw answers `server`, so the cron
 * service shows it. Stays a job could not close are counted in its `failed`, and answered 200: one
 * bad stay never turns every run red, which a cron service may answer by switching the job off.
 */
export function createJobsRouter(jobs: Jobs, secret: string): Router {
  const router = Router();
  router.post('/run', async (req: Request, res: Response) => {
    if (!matchesSecret(req.get('authorization'), secret)) throw AppError.unauthorized();
    const { ranAt, jobs: ran, failed } = await jobs.run();
    if (failed) throw AppError.server(undefined, 'A timed job failed');
    sendSuccess(res, { ranAt, jobs: ran });
  });
  return router;
}
