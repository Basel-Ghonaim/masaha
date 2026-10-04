import type { Session, SessionUser } from '@masaha/shared/auth';
import type { DomainErrorCode } from '@masaha/shared/core';
import { AppError, type AppErrorType } from '@shared/errors';

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
