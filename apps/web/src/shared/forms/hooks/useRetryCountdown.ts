import type { AppError } from '@shared/errors';
import { useEffect, useState } from 'react';

/** What the count needs of a failure: its type and the wait it asked for. */
type Wait = Pick<AppError, 'type' | 'retryAfterSeconds'>;

/** The wait a failure asks for: a refusal for too many attempts, with its `Retry-After`. */
function waitOf(failure: Wait | null): number {
  return failure?.type === 'rate_limit' ? (failure.retryAfterSeconds ?? 0) : 0;
}

/**
 * The whole seconds left before a refused form may be sent again, counting down from the
 * `Retry-After` of a `rate_limit` failure to 0. Any other failure, or none, waits 0. A new failure
 * starts its own count, so the failure is the one the form holds, the same object from one render to
 * the next.
 */
export function useRetryCountdown(failure: Wait | null): number {
  const [counted, setCounted] = useState(failure);
  const [left, setLeft] = useState(() => waitOf(failure));

  // A new failure resets the count while rendering, so no frame shows the last one's.
  if (counted !== failure) {
    setCounted(failure);
    setLeft(waitOf(failure));
  }

  useEffect(() => {
    const wait = waitOf(failure);
    if (wait <= 0) return;
    // Counted against a deadline, so a late tick never stretches the wait.
    const deadline = Date.now() + wait * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [failure]);

  return left;
}
