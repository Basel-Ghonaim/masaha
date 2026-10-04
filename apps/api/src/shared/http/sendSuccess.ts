import type { PaginationMeta, SuccessEnvelope } from '@masaha/shared/core';
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
  const body: SuccessEnvelope<unknown, PaginationMeta> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  res.status(status).json(body);
}

/** 204 carries no body, so no envelope. */
export function sendNoContent(res: Response) {
  res.status(204).end();
}
