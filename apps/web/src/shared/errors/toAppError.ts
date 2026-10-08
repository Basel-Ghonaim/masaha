import {
  DOMAIN_ERROR_CODES,
  ERROR_TYPES,
  FIELD_ERROR_CODES,
  type DomainErrorCode,
  type ErrorEnvelope,
  type ErrorType,
  type FieldErrorCode,
  type FieldErrors,
} from '@masaha/shared/core';
import type { AxiosError } from 'axios';
import { AppError } from './AppError';
import type { AppErrorType, ClientErrorType } from './errorTypes';
import { retryAfterSeconds } from './retryAfter';

// The contract's status for each type (docs/api/api-contract.md §3), read backwards: an answer without
// the envelope, such as a proxy's 502, is typed by its status alone. The API holds the same table
// (docs/architecture/findings/24-the-status-of-each-error-type-is-written-twice.md).
const TYPE_BY_STATUS: Readonly<Partial<Record<number, ErrorType>>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'validation',
  429: 'rate_limit',
  500: 'server',
  503: 'service_unavailable',
};

/** The fields of the error envelope (api-contract §2), none of them trusted yet. */
type UncheckedEnvelope = Partial<Record<keyof ErrorEnvelope['error'], unknown>>;

/**
 * The one normaliser: any failure becomes an `AppError` (docs/frontend/architecture.md §5). An
 * `AppError` passes through unchanged, so normalising twice changes nothing.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (!isAxiosError(error)) {
    return new AppError({
      type: 'unknown',
      status: 0,
      message: error instanceof Error ? error.message : 'Unknown failure',
      cause: error,
    });
  }

  const { response } = error;
  if (!response) {
    return new AppError({
      type: typeOfCode(error.code),
      status: 0,
      message: error.message,
      cause: error,
    });
  }

  const envelope = envelopeOf(response.data);
  const type = envelope.type;
  const code = envelope.code;

  return new AppError({
    type: isErrorType(type) ? type : typeOfStatus(response.status),
    status: response.status,
    // A code this client does not know is dropped, so `code ?? type` always has a catalogue line.
    code: isDomainErrorCode(code) ? code : undefined,
    errors: knownFieldErrors(envelope.errors),
    // A proxy's answer has no body, but the header still names the request.
    requestId:
      stringOrUndefined(envelope.requestId) ??
      stringOrUndefined(header(response.headers, 'x-request-id')),
    retryAfterSeconds: retryAfterSeconds(header(response.headers, 'retry-after')),
    message: stringOrUndefined(envelope.message) ?? error.message,
    cause: error,
  });
}

/** Axios's own test, made on the shape, so this module needs Axios's types only. */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    error.isAxiosError === true
  );
}

/** A failure with no answer, by the code Axios gives it. */
function typeOfCode(code: string | undefined): ClientErrorType {
  switch (code) {
    case 'ERR_NETWORK':
      return 'network';
    case 'ECONNABORTED':
    case 'ETIMEDOUT':
      return 'timeout';
    case 'ERR_CANCELED':
      return 'canceled';
    default:
      return 'unknown';
  }
}

function typeOfStatus(status: number): AppErrorType {
  return TYPE_BY_STATUS[status] ?? (status >= 500 ? 'server' : 'unknown');
}

function envelopeOf(body: unknown): UncheckedEnvelope {
  if (typeof body !== 'object' || body === null || !('error' in body)) return {};
  const { error } = body;
  return typeof error === 'object' && error !== null ? error : {};
}

function isErrorType(value: unknown): value is ErrorType {
  return (ERROR_TYPES as readonly unknown[]).includes(value);
}

function isDomainErrorCode(value: unknown): value is DomainErrorCode {
  return (DOMAIN_ERROR_CODES as readonly unknown[]).includes(value);
}

function isFieldErrorCode(value: unknown): value is FieldErrorCode {
  return (FIELD_ERROR_CODES as readonly unknown[]).includes(value);
}

/**
 * The field errors, keeping only the codes this client knows, as with domain codes, so each code a
 * screen reads has a catalogue line. A field left with no known code is dropped; the `validation` type
 * still says something needs attention.
 */
function knownFieldErrors(value: unknown): FieldErrors | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const fields = Object.entries(value).flatMap(([field, codes]: [string, unknown]) => {
    const known = Array.isArray(codes) ? codes.filter(isFieldErrorCode) : [];
    return known.length > 0 ? [[field, known] as const] : [];
  });
  return fields.length > 0 ? Object.fromEntries(fields) : undefined;
}

/** A response header, whatever the case of its name. */
function header(headers: unknown, name: string): unknown {
  if (typeof headers !== 'object' || headers === null) return undefined;
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
  return key === undefined ? undefined : (headers as Record<string, unknown>)[key];
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}
