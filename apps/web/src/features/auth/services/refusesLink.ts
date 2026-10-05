import type { AppError } from '@shared/errors';

/** Whether a check's refusal is a verdict on the link itself: unknown, expired or used, or malformed. */
export function refusesLink(error: Pick<AppError, 'type' | 'code'>): boolean {
  return error.code === 'RESET_TOKEN_INVALID' || error.type === 'validation';
}
