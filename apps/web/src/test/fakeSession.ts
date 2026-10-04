import type { Session, SessionUser } from '@masaha/shared/auth';
import type { DomainErrorCode } from '@masaha/shared/core';
import { AppError, type AppErrorType } from '@shared/errors';
import { vi } from 'vitest';

/** A session as the server sends it; `user` overrides the user's fields. */
export function aSession(user: Partial<SessionUser> = {}, accessToken = 'token-1'): Session {
  return {
    user: {
      id: 1,
      email: 'sara@example.com',
      name: 'Sara',
      role: 'USER',
      language: 'ar',
      mustChangePassword: false,
      hasPassword: true,
      spaces: [],
      ...user,
    },
    accessToken,
  };
}

/** The AppError the transport rejects with for a failure of this type and status, and its code. */
export function appError(type: AppErrorType, status: number, code?: DomainErrorCode): AppError {
  return new AppError({ type, status, code, message: `Fake ${type}` });
}

/** A stand-in session hint: present or not, and cleared by the session. */
export function fakeHint(present: boolean) {
  const hint = {
    present,
    isPresent: () => hint.present,
    clear: vi.fn(() => {
      hint.present = false;
    }),
  };
  return hint;
}

/**
 * Stand-in session repository, for the session's operations and the screens that use them. Each
 * answers with what the test passes, a value or a rejection, and counts its calls.
 */
export function fakeSessionRepository({
  refresh = () => Promise.resolve(aSession()),
  logout = () => Promise.resolve(),
}: {
  refresh?: () => Promise<Session>;
  logout?: () => Promise<void>;
} = {}) {
  return { refresh: vi.fn(refresh), logout: vi.fn(logout) };
}

/** A promise the test settles when it chooses. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
