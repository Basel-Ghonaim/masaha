import type { AppError } from '@shared/errors';
import type { ReadFailure } from '../types/ReadFailure';

/** Why a read of the recovery failed: `offline` when no answer came back, else `error`. */
export function readFailure(error: Pick<AppError, 'type'>): ReadFailure {
  return error.type === 'network' || error.type === 'timeout' ? 'offline' : 'error';
}
