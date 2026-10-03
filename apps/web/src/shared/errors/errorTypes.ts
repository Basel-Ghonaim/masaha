import type { ErrorType } from '@masaha/shared';

/**
 * The failures only the client can name, because no answer came back, or none it understands. The
 * server's types are the contract's (`ErrorType` from @masaha/shared) and are never repeated here.
 */
export type ClientErrorType = 'network' | 'timeout' | 'canceled' | 'unknown';

/** Every type an `AppError` carries: the server's, and the client's own. */
export type AppErrorType = ErrorType | ClientErrorType;
