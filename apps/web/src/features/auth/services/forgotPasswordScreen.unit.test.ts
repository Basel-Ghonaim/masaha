import type { RecoveryPosition } from '@masaha/shared/auth';
import { describe, expect, it } from 'vitest';
import { MASKED_EMAIL, sentPosition } from '../../../test/fakeRecovery';
import { appError } from '../../../test/fakeSession';
import { forgotPasswordScreen } from './forgotPasswordScreen';

const PASSWORD: RecoveryPosition = { step: 'password', email: MASKED_EMAIL };

/** The screen for a read that answered `position`, with nothing else going on. */
function screenAt(position: RecoveryPosition, restarting = false) {
  return forgotPasswordScreen({ position, failure: null, fetching: false, restarting });
}

describe('forgotPasswordScreen', () => {
  it('waits while the position is first read', () => {
    expect(
      forgotPasswordScreen({
        position: undefined,
        failure: null,
        fetching: true,
        restarting: false,
      }),
    ).toEqual({ kind: 'loading' });
  });

  it('offers a retry, never the email form, when the first read fails', () => {
    expect(
      forgotPasswordScreen({
        position: undefined,
        failure: appError('network', 0),
        fetching: false,
        restarting: false,
      }),
    ).toEqual({ kind: 'unreachable', reason: 'offline' });
  });

  it('waits again while a failed read is retried', () => {
    expect(
      forgotPasswordScreen({
        position: undefined,
        failure: appError('server', 500),
        fetching: true,
        restarting: false,
      }),
    ).toEqual({ kind: 'loading' });
  });

  it('keeps the step it read when a later read fails', () => {
    expect(
      forgotPasswordScreen({
        position: sentPosition(),
        failure: appError('network', 0),
        fetching: false,
        restarting: false,
      }),
    ).toEqual({ kind: 'sent', email: MASKED_EMAIL, canResend: true });
  });

  it('shows the email form without a recovery', () => {
    expect(screenAt({ step: 'request' })).toEqual({ kind: 'request' });
  });

  it('shows the link sent, with whether another may be asked for', () => {
    expect(screenAt(sentPosition({ canResend: false }))).toEqual({
      kind: 'sent',
      email: MASKED_EMAIL,
      canResend: false,
    });
  });

  it('shows the open link once one was checked in this browser', () => {
    expect(screenAt(PASSWORD)).toEqual({ kind: 'linkOpen', email: MASKED_EMAIL });
  });

  it.each([sentPosition({ canResend: false }), PASSWORD])(
    'shows the email form when the reader chose to enter it again, at $step',
    (position) => {
      expect(screenAt(position, true)).toEqual({ kind: 'request' });
    },
  );
});
