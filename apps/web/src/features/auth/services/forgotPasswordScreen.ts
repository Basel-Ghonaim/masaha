import type { RecoveryPosition } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import type { ReadFailure } from '../types/ReadFailure';
import { readFailure } from './readFailure';

/** What the forgotten password's page shows, decided from where the recovery stands. */
export type ForgotPasswordScreen =
  /** The position is read for the first time. */
  | { kind: 'loading' }
  /** The position could not be read: a retry, never the start of a recovery the server may hold. */
  | { kind: 'unreachable'; reason: ReadFailure }
  /** The email form, to ask for a link. */
  | { kind: 'request' }
  /** A link was asked for; another may be asked for while `canResend`. The email is masked. */
  | { kind: 'sent'; email: string; canResend: boolean }
  /** A link was checked in this browser: the new password is next. The email is masked. */
  | { kind: 'linkOpen'; email: string };

/**
 * Which screen the forgotten password's page shows (docs/architecture/decisions/0017): the step the
 * server holds. A position already read is kept through a failed read again; with none, a failure
 * offers a retry, never the email form, so the reader is not sent back to the start of a recovery
 * the server may still hold. `restarting` is the reader's choice to enter the email again.
 */
export function forgotPasswordScreen({
  position,
  failure,
  fetching,
  restarting,
}: {
  /** The position the server answered, if one was read. */
  position: RecoveryPosition | undefined;
  /** The last read's failure. */
  failure: AppError | null;
  /** A read is under way. */
  fetching: boolean;
  restarting: boolean;
}): ForgotPasswordScreen {
  if (position === undefined) {
    return failure === null || fetching
      ? { kind: 'loading' }
      : { kind: 'unreachable', reason: readFailure(failure) };
  }
  if (restarting || position.step === 'request') {
    return { kind: 'request' };
  }
  if (position.step === 'sent') {
    return { kind: 'sent', email: position.email, canResend: position.canResend };
  }
  return { kind: 'linkOpen', email: position.email };
}
