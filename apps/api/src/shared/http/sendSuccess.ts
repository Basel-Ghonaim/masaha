import type { PaginationMeta } from '@masaha/shared/core';
import type { Response } from 'express';

interface SuccessOptions {
  status?: number;
  meta?: PaginationMeta;
}

/** Sends the success envelope (docs/api/api-contract.md §2). */
export function sendSuccess(
  res: Response,
  data: unknown,
  { status = 200, meta }: SuccessOptions = {},
) {
  res.status(status).json({ success: true, data, ...(meta && { meta }) });
}

/** 204 carries no body, so no envelope. */
export function sendNoContent(res: Response) {
  res.status(204).end();
}
