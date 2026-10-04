import type { DomainErrorCode } from '@masaha/shared/core';
import type { AppErrorType } from '@shared/errors';

/**
 * What a failure says, by the domain code or error type the server sends (docs/api/api-contract.md
 * §3 and §6), or the type the client gives a failure with no answer (docs/frontend/architecture.md
 * §5): a screen reads `errors[code ?? type]`, unless it has something more specific to say.
 */
export const ERRORS = {
  bad_request: 'The request could not be understood. Please try again.',
  unauthorized: 'Please sign in to continue.',
  forbidden: 'You don’t have permission to do this.',
  not_found: 'We couldn’t find what you were looking for.',
  conflict: 'This conflicts with a change already made. Refresh and try again.',
  payload_too_large: 'The file is too large.',
  unsupported_media_type: 'This file type isn’t supported.',
  validation: 'Some fields need your attention.',
  rate_limit: 'Too many attempts. Please wait a moment and try again.',
  server: 'Something went wrong on our side. Please try again.',
  service_unavailable: 'The service is temporarily unavailable. Please try again shortly.',

  network: 'No connection. Check your internet and try again.',
  timeout: 'The server took too long to respond. Please try again.',
  canceled: 'The request was canceled.',
  unknown: 'Something went wrong. Please try again.',

  EMAIL_TAKEN: 'An account with this email already exists.',
  PHONE_TAKEN: 'This phone number is already in use.',
  INVALID_CREDENTIALS: 'The email or password is incorrect.',
  ACCOUNT_SUSPENDED: 'This account is suspended.',
  PASSWORD_CHANGE_REQUIRED: 'Change your temporary password to continue.',
  SPACE_NOT_MANAGED: 'You don’t manage this space.',
  MEMBER_ALREADY_CHECKED_IN: 'This customer is already checked in.',
  CHECK_IN_ALREADY_CLOSED: 'This check-in is already closed.',
  SPACE_CAPACITY_NOT_SET: 'Set the space’s capacity first.',
  OUTSIDE_OPENING_HOURS: 'This check-in is outside the space’s opening hours.',
  OWNER_ALREADY_LINKED: 'This owner is already linked to the space.',
  CURRENT_PASSWORD_INCORRECT: 'The current password is incorrect.',
  GOOGLE_TOKEN_INVALID: 'We couldn’t sign you in with Google. Try again or use your email.',
  RESET_TOKEN_INVALID: 'The link has expired or was already used.',
  GOOGLE_LINK_NOT_ALLOWED:
    'An account with this email already exists. Sign in with its password, or reset the password, to continue.',
  PASSWORD_NOT_SET:
    'This account has no password yet. Set one from the link we email you under “Forgot password”.',
} as const satisfies Record<AppErrorType | DomainErrorCode, string>;
