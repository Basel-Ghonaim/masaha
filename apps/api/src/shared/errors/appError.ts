import type { DomainErrorCode, ErrorType, FieldErrors } from '@masaha/shared';

// docs/api/api-contract.md §3. `message` is English for developers and logs, never shown to users.
const ERROR_DEFINITIONS = {
  bad_request: { status: 400, message: 'Malformed request' },
  unauthorized: { status: 401, message: 'Authentication required' },
  forbidden: { status: 403, message: 'Not permitted' },
  not_found: { status: 404, message: 'Not found' },
  conflict: { status: 409, message: 'Conflict' },
  payload_too_large: { status: 413, message: 'Payload too large' },
  unsupported_media_type: { status: 415, message: 'Unsupported media type' },
  validation: { status: 422, message: 'Validation failed' },
  rate_limit: { status: 429, message: 'Too many requests' },
  server: { status: 500, message: 'Internal server error' },
  service_unavailable: { status: 503, message: 'Service unavailable' },
} as const satisfies Record<ErrorType, { status: number; message: string }>;

/** The one error shape every layer throws; the error handler turns it into the error envelope. */
export class AppError extends Error {
  override name = 'AppError';
  readonly type: ErrorType;
  readonly status: number;
  readonly code: DomainErrorCode | undefined;
  readonly errors: FieldErrors | undefined;

  constructor(type: ErrorType, code?: DomainErrorCode, message?: string, errors?: FieldErrors) {
    const definition = ERROR_DEFINITIONS[type];
    super(message ?? definition.message);
    this.type = type;
    this.status = definition.status;
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

  static rateLimit(code?: DomainErrorCode, message?: string) {
    return new AppError('rate_limit', code, message);
  }

  static server(code?: DomainErrorCode, message?: string) {
    return new AppError('server', code, message);
  }

  static serviceUnavailable(code?: DomainErrorCode, message?: string) {
    return new AppError('service_unavailable', code, message);
  }
}

/** The error type for an HTTP status, when the contract defines one. */
export function errorTypeForStatus(status: number): ErrorType | undefined {
  const entry = Object.entries(ERROR_DEFINITIONS).find(
    ([, definition]) => definition.status === status,
  );
  return entry?.[0] as ErrorType | undefined;
}
