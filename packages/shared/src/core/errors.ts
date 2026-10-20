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

/** The HTTP status of each error type (docs/api/api-contract.md §3), the one table both apps read. */
export const ERROR_STATUSES = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  validation: 422,
  rate_limit: 429,
  server: 500,
  service_unavailable: 503,
} as const satisfies Record<ErrorType, number>;

/** The error type of an HTTP status, when the contract gives one: the table read backwards. */
export function errorTypeOfStatus(status: number): ErrorType | undefined {
  return ERROR_TYPES.find((type) => ERROR_STATUSES[type] === status);
}

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
  'TEMPORARY_PASSWORD_NOT_PENDING',
  'TEMPORARY_PASSWORD_EXPIRED',
  'OWN_ACCOUNT',
  'LAST_ADMIN',
  'GOOGLE_ONLY_ACCOUNT',
  // auth
  'INVALID_CREDENTIALS',
  'GOOGLE_TOKEN_INVALID',
  'GOOGLE_LINK_NOT_ALLOWED',
  'RESET_TOKEN_INVALID',
  'RECOVERY_INVALID',
  'RESEND_LIMIT_REACHED',
  // space-links
  'SPACE_NOT_MANAGED',
  'ACCOUNT_IS_ADMIN',
  'RECEPTION_LINK_ACTIVE',
  'EMAIL_HAS_ACCOUNT',
  'ALREADY_OWNER',
  'ACCOUNT_HAS_LINKS',
  'ACCOUNT_PASSWORD_PENDING',
  // customers
  'PHONE_TAKEN',
  // the check-in (visits, subscriptions)
  'MEMBER_ALREADY_CHECKED_IN',
  'CHECK_IN_ALREADY_CLOSED',
  'OUTSIDE_OPENING_HOURS',
  // occupancy
  'SPACE_CAPACITY_NOT_SET',
  'SPACE_NOT_OPEN',
  'SPACE_FULL',
  // the price typed by hand (can())
  'PRICE_TYPING_NOT_ALLOWED',
  // payments: the ledger's rules, from the database's constraints
  'PAYMENT_EXCEEDS_DUE',
  'VISIT_NOT_PRICED',
  // the check-out (desk)
  'VISIT_ALREADY_CLOSED',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];
