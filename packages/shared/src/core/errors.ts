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

// One list for every capability, grouped by the capability whose rule each code reports.
export const DOMAIN_ERROR_CODES = [
  // users
  'EMAIL_TAKEN',
  'ACCOUNT_SUSPENDED',
  'PASSWORD_CHANGE_REQUIRED',
  'CURRENT_PASSWORD_INCORRECT',
  'PASSWORD_NOT_SET',
  // auth
  'INVALID_CREDENTIALS',
  'GOOGLE_TOKEN_INVALID',
  'GOOGLE_LINK_NOT_ALLOWED',
  'RESET_TOKEN_INVALID',
  // space-links
  'SPACE_NOT_MANAGED',
  'OWNER_ALREADY_LINKED',
  // customers
  'PHONE_TAKEN',
  // the check-in (visits, subscriptions)
  'MEMBER_ALREADY_CHECKED_IN',
  'CHECK_IN_ALREADY_CLOSED',
  'OUTSIDE_OPENING_HOURS',
  // occupancy
  'SPACE_CAPACITY_NOT_SET',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];
