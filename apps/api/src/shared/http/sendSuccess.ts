import type { Response } from 'express';

interface SuccessOptions {
  status?: number;
}

/** Sends the success envelope (docs/api/api-contract.md §2). */
export function sendSuccess(res: Response, data: unknown, { status = 200 }: SuccessOptions = {}) {
  res.status(status).json({ success: true, data });
}

/** 204 carries no body, so no envelope. */
export function sendNoContent(res: Response) {
  res.status(204).end();
}
