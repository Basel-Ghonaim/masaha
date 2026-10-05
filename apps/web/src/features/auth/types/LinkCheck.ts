import type { AppError } from '@shared/errors';

/** Where the check of the link in the address stands. */
export type LinkCheck =
  /** The address carried no link, or its check bound it. */
  | { status: 'none' }
  | { status: 'pending' }
  /** The check failed: with no answer the token is still held, for a retry. */
  | { status: 'failed'; error: Pick<AppError, 'type' | 'code'> };
