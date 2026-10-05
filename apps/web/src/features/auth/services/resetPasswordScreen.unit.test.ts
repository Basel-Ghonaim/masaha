import type { RecoveryPosition } from '@masaha/shared/auth';
import { describe, expect, it } from 'vitest';
import { MASKED_EMAIL, sentPosition } from '../../../test/fakeRecovery';
import { appError } from '../../../test/fakeSession';
import type { LinkCheck } from '../types/LinkCheck';
import { resetPasswordScreen } from './resetPasswordScreen';

const PASSWORD: RecoveryPosition = { step: 'password', email: MASKED_EMAIL };
const NONE: LinkCheck = { status: 'none' };

/** The screen with nothing going on but `state`. */
function screenOf(state: Partial<Parameters<typeof resetPasswordScreen>[0]>) {
  return resetPasswordScreen({
    done: false,
    check: NONE,
    position: undefined,
    failure: null,
    fetching: false,
    ...state,
  });
}

describe('resetPasswordScreen', () => {
  it('waits while the link is checked', () => {
    expect(screenOf({ check: { status: 'pending' } })).toEqual({ kind: 'loading' });
  });

  it('offers a retry when the check got no answer', () => {
    expect(screenOf({ check: { status: 'failed', error: appError('timeout', 0) } })).toEqual({
      kind: 'unreachable',
      reason: 'offline',
    });
  });

  it.each([
    ['an unknown, expired or used link', appError('bad_request', 400, 'RESET_TOKEN_INVALID')],
    ['a malformed link', appError('validation', 422)],
  ])('says the link can no longer be used for %s', (_, error) => {
    expect(screenOf({ check: { status: 'failed', error } })).toEqual({ kind: 'invalid' });
  });

  it('shows why a check answered with no verdict on the link failed', () => {
    const error = appError('rate_limit', 429);

    expect(screenOf({ check: { status: 'failed', error } })).toEqual({
      kind: 'checkFailed',
      error,
    });
  });

  it('waits while the position is first read', () => {
    expect(screenOf({ fetching: true })).toEqual({ kind: 'loading' });
  });

  it('offers a retry when the position cannot be read', () => {
    expect(screenOf({ failure: appError('server', 500) })).toEqual({
      kind: 'unreachable',
      reason: 'error',
    });
  });

  it('shows the form, for the account’s masked email, once a link is open in this browser', () => {
    expect(screenOf({ position: PASSWORD })).toEqual({ kind: 'form', email: MASKED_EMAIL });
  });

  it('keeps the form it read when a later read fails', () => {
    expect(screenOf({ position: PASSWORD, failure: appError('network', 0) })).toEqual({
      kind: 'form',
      email: MASKED_EMAIL,
    });
  });

  it.each([{ step: 'request' } as const, sentPosition()])(
    'says no link can be used without one open in this browser, at $step',
    (position) => {
      expect(screenOf({ position })).toEqual({ kind: 'invalid' });
    },
  );

  it('says the password was set, whatever the recovery’s position is then', () => {
    expect(screenOf({ done: true, position: { step: 'request' } })).toEqual({ kind: 'done' });
  });
});
