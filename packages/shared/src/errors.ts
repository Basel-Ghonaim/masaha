// The error vocabulary of the API contract (docs/api/api-contract.md §3 and §6). The server sends
// these codes, never display text; the client translates them.

export const ERROR_TYPES = [
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'payload_too_large',
  'unsupported_media_type',
  'validation',
  'rate_limit',
  'server',
  'service_unavailable',
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

export const FIELD_ERROR_CODES = [
  'required',
  'too_short',
  'too_long',
  'invalid_format',
  'out_of_range',
  'not_unique',
  'invalid_choice',
] as const;

export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

/** Field → the codes of every rule it failed, e.g. `{ phone: ['invalid_format'] }`. */
export type FieldErrors = Record<string, FieldErrorCode[]>;

export const DOMAIN_ERROR_CODES = [
  'EMAIL_TAKEN',
  'PHONE_TAKEN',
  'INVALID_CREDENTIALS',
  'ACCOUNT_SUSPENDED',
  'PASSWORD_CHANGE_REQUIRED',
  'SPACE_NOT_MANAGED',
  'MEMBER_ALREADY_CHECKED_IN',
  'CHECK_IN_ALREADY_CLOSED',
  'SPACE_CAPACITY_NOT_SET',
  'OUTSIDE_OPENING_HOURS',
  'OWNER_ALREADY_LINKED',
  'CURRENT_PASSWORD_INCORRECT',
  'GOOGLE_TOKEN_INVALID',
  'RESET_TOKEN_INVALID',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];
