import {
  ERROR_STATUSES,
  type DomainErrorCode,
  type ErrorType,
  type FieldErrors,
} from '@masaha/shared/core';

// Each type's status is the shared table's (docs/api/api-contract.md §3). `message` is English for
// developers and logs, never shown to users.
const ERROR_MESSAGES = {
  bad_request: 'Malformed request',
  unauthorized: 'Authentication required',
  forbidden: 'Not permitted',
  not_found: 'Not found',
  conflict: 'Conflict',
  payload_too_large: 'Payload too large',
  unsupported_media_type: 'Unsupported media type',
  validation: 'Validation failed',
  rate_limit: 'Too many requests',
  server: 'Internal server error',
  service_unavailable: 'Service unavailable',
} as const satisfies Record<ErrorType, string>;

/** What a 429 tells the client about the limit it reached, in its headers. */
export interface RateLimitState {
  /** The policy's name. */
  policy: string;
  limit: number;
  windowSeconds: number;
  /** Until the window resets. */
  retryAfterSeconds: number;
}

/** The one error shape every layer throws; the error handler turns it into the error envelope. */
export class AppError extends Error {
  override name = 'AppError';
  readonly type: ErrorType;
  readonly status: number;
  readonly code: DomainErrorCode | undefined;
  readonly errors: FieldErrors | undefined;
  /** Set on a `rate_limit` error that knows its limit. */
  rateLimitState: RateLimitState | undefined;

  constructor(type: ErrorType, code?: DomainErrorCode, message?: string, errors?: FieldErrors) {
    super(message ?? ERROR_MESSAGES[type]);
    this.type = type;
    this.status = ERROR_STATUSES[type];
    this.code = code;
    this.errors = errors;
  }

  static badRequest(code?: DomainErrorCode, message?: string) {
    return new AppError('bad_request', code, message);
  }

  static unauthorized(code?: DomainErrorCode, message?: string) {
    return new AppError('unauthorized', code, message);
  }

  static forbidden(code?: DomainErrorCode, message?: string) {
    return new AppError('forbidden', code, message);
  }

  static notFound(code?: DomainErrorCode, message?: string) {
    return new AppError('not_found', code, message);
  }

  static conflict(code?: DomainErrorCode, message?: string, errors?: FieldErrors) {
    return new AppError('conflict', code, message, errors);
  }

  static payloadTooLarge(code?: DomainErrorCode, message?: string) {
    return new AppError('payload_too_large', code, message);
  }

  static unsupportedMediaType(code?: DomainErrorCode, message?: string) {
    return new AppError('unsupported_media_type', code, message);
  }

  /** The only type that always carries field errors. */
  static validation(errors: FieldErrors, code?: DomainErrorCode, message?: string) {
    return new AppError('validation', code, message, errors);
  }

  static rateLimit(code?: DomainErrorCode, message?: string, state?: RateLimitState) {
    const error = new AppError('rate_limit', code, message);
    error.rateLimitState = state;
    return error;
  }

  static server(code?: DomainErrorCode, message?: string) {
    return new AppError('server', code, message);
  }

  static serviceUnavailable(code?: DomainErrorCode, message?: string) {
    return new AppError('service_unavailable', code, message);
  }
}
