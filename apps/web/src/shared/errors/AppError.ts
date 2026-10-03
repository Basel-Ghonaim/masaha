import type { DomainErrorCode, FieldErrors } from '@masaha/shared';
import type { AppErrorType } from './errorTypes';

type AppErrorFields = {
  type: AppErrorType;
  status: number;
  code?: DomainErrorCode | undefined;
  errors?: FieldErrors | undefined;
  requestId?: string | undefined;
  retryAfterSeconds?: number | undefined;
  /** For developers and logs only. */
  message: string;
  cause?: unknown;
};

/**
 * Any failure, in one shape (docs/frontend/architecture.md §5). It decides the failure's type and never
 * words it: a screen reads the catalogue's line for `code ?? type`. Its `message` is for developers and
 * logs, and is never shown.
 */
export class AppError extends Error {
  override readonly name = 'AppError';
  readonly type: AppErrorType;
  /** The HTTP status, or 0 when no answer came back. */
  readonly status: number;
  /** The server's domain code, when it is one the client knows. */
  readonly code: DomainErrorCode | undefined;
  /** Field → the codes of the rules it failed. */
  readonly errors: FieldErrors | undefined;
  /** The server's id for the request, present whenever the server answered (api-contract §1). */
  readonly requestId: string | undefined;
  /** The wait the answer asked for in `Retry-After`, in whole seconds. */
  readonly retryAfterSeconds: number | undefined;

  constructor({ message, cause, ...fields }: AppErrorFields) {
    super(message, { cause });
    this.type = fields.type;
    this.status = fields.status;
    this.code = fields.code;
    this.errors = fields.errors;
    this.requestId = fields.requestId;
    this.retryAfterSeconds = fields.retryAfterSeconds;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
