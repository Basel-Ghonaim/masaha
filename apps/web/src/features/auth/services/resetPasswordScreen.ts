import type { RecoveryPosition } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import type { LinkCheck } from '../types/LinkCheck';
import type { ReadFailure } from '../types/ReadFailure';
import { readFailure } from './readFailure';
import { refusesLink } from './refusesLink';

/** What the reset page shows, decided from the link's check and where the recovery stands. */
export type ResetPasswordScreen =
  /** The link is checked, or the position read, for the first time. */
  | { kind: 'loading' }
  /** No answer to the check, or no position read: a retry. */
  | { kind: 'unreachable'; reason: ReadFailure }
  /** The check was answered with no verdict on the link, such as too many attempts. */
  | { kind: 'checkFailed'; error: Pick<AppError, 'type' | 'code'> }
  /** The link has expired or was used, or no link is open in this browser. */
  | { kind: 'invalid' }
  /** The link is open: the new password, for the account's masked email. */
  | { kind: 'form'; email: string }
  /** The password was set. */
  | { kind: 'done' };

/**
 * Which screen the reset page shows (docs/architecture/decisions/0017). Once set, the password
 * stays set. A link in the address is checked first; the page then shows the step the server holds:
 * the form once a link is open in this browser, and otherwise that no link is. A position already
 * read is kept through a failed read again; with none, a failure offers a retry.
 */
export function resetPasswordScreen({
  done,
  check,
  position,
  failure,
  fetching,
}: {
  done: boolean;
  check: LinkCheck;
  /** The position the server answered, if one was read. */
  position: RecoveryPosition | undefined;
  /** The last read's failure. */
  failure: AppError | null;
  /** A read is under way. */
  fetching: boolean;
}): ResetPasswordScreen {
  if (done) {
    return { kind: 'done' };
  }
  if (check.status === 'pending') {
    return { kind: 'loading' };
  }
  if (check.status === 'failed') {
    const reason = readFailure(check.error);
    if (reason === 'offline') return { kind: 'unreachable', reason };
    return refusesLink(check.error)
      ? { kind: 'invalid' }
      : { kind: 'checkFailed', error: check.error };
  }
  if (position === undefined) {
    return failure === null || fetching
      ? { kind: 'loading' }
      : { kind: 'unreachable', reason: readFailure(failure) };
  }
  return position.step === 'password'
    ? { kind: 'form', email: position.email }
    : { kind: 'invalid' };
}
