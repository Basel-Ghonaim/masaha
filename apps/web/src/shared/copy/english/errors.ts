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
  SPACE_NOT_OPEN:
    'The status can’t be set now: the space is closed, outside its hours, or has no active owner.',
  OUTSIDE_OPENING_HOURS: 'This check-in is outside the space’s opening hours.',
  SPACE_FULL: 'The space is full; the check-in was recorded anyway.',
  PRICE_TYPING_NOT_ALLOWED: 'The space’s settings do not let reception type a price.',
  PAYMENT_EXCEEDS_DUE: 'The amount is more than what is due.',
  VISIT_NOT_PRICED: 'This visit has no price yet; price it first.',
  VISIT_ALREADY_PRICED: 'This visit already has a price.',
  VISIT_ALREADY_CLOSED: 'This visit was already checked out; this payment was not recorded.',
  VISIT_ALREADY_PAID: 'This visit is already paid in full.',
  VISIT_WRITTEN_OFF:
    'This visit was written off; the owner must undo the write-off before it takes a payment.',
  VISIT_HAS_CUSTOMER: "This visit is already another customer's debt.",
  CUSTOMER_ARCHIVED: 'This customer is archived; the owner restores them first.',
  SUBSCRIPTION_ALREADY_RENEWED: 'This subscription was already renewed.',
  CUSTOMER_HAS_DEBT: 'The customer still owes on an earlier item.',
  ACCOUNT_IS_ADMIN: 'An admin account can’t be a space’s owner.',
  RECEPTION_LINK_ACTIVE:
    'This person works at this space’s reception. Its owner deactivates that link first.',
  EMAIL_HAS_ACCOUNT: 'This email already has an account. Upgrade it to an owner to link it.',
  ALREADY_OWNER: 'This person is already an owner. Link them to the space instead.',
  CURRENT_PASSWORD_INCORRECT: 'The current password is incorrect.',
  GOOGLE_TOKEN_INVALID: 'We couldn’t sign you in with Google. Try again or use your email.',
  RESET_TOKEN_INVALID: 'The link has expired or was already used.',
  RECOVERY_INVALID: 'Your password recovery has ended. Ask for a new link.',
  RESEND_LIMIT_REACHED:
    'You’ve asked for the link too many times. Enter your email again to ask for another.',
  GOOGLE_LINK_NOT_ALLOWED:
    'An account with this email already exists. Sign in with its password; if you don’t know it, reset it, or ask whoever created your account.',
  PASSWORD_NOT_SET:
    'This account has no password yet. Set one from the link we email you under “Forgot password”.',
  TEMPORARY_PASSWORD_NOT_PENDING:
    'This account has no temporary password waiting to be changed, so there is no handover to record.',
  TEMPORARY_PASSWORD_EXPIRED:
    'This temporary password has expired. Ask whoever created your account for a new one.',
  OWN_ACCOUNT: 'You can’t do this to your own account.',
  LAST_ADMIN: 'The platform must keep at least one active admin.',
  GOOGLE_ONLY_ACCOUNT: 'This account signs in with Google only, so it has no password to replace.',
  ACCOUNT_HAS_LINKS:
    'This person is linked to a space, and their role follows those links. Unlink them first.',
  ACCOUNT_PASSWORD_PENDING:
    'This person hasn’t changed their temporary password yet; the account can’t be upgraded or linked until they sign in and change it.',
} as const satisfies Record<AppErrorType | DomainErrorCode, string>;
