import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import type { FormFailureView } from '../types/FormFailureView';
import { useRetryCountdown } from './useRetryCountdown';

// A value inserted into a sentence, isolated left to right so it never reorders the sentence around
// it (docs/frontend/design-system/foundation.md §8).
function isolated(value: string): string {
  return `\u2066${value}\u2069`;
}

// The wait as a clock: minutes and seconds.
function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return isolated(`${String(minutes)}:${rest}`);
}

/**
 * Reads a form's failure into what the form shows (docs/frontend/architecture.md §3):
 * - too many attempts counts down the `Retry-After` the server sent, and the view is gone when the
 *   count ends; without a `Retry-After`, it says to wait a moment;
 * - no connection, or no answer in time, offers `retry`;
 * - any other refusal shows `title` and the failure's line (`code ?? type`); one with no domain code
 *   also shows the request's reference, so a report can be matched to the log.
 * `blocked` holds while the count runs: the form keeps its submit disabled until it ends. The failure
 * is the one the form holds, the same object from one render to the next.
 */
export function useFormFailure(
  failure: AppError | null,
  { title, retry }: { title: string; retry: () => void },
): { view: FormFailureView | null; blocked: boolean } {
  const copy = useCopy();
  const secondsLeft = useRetryCountdown(failure);
  const blocked = secondsLeft > 0;

  if (failure === null) {
    return { view: null, blocked };
  }

  if (failure.type === 'rate_limit') {
    if (failure.retryAfterSeconds === undefined) {
      return { view: { kind: 'rateLimit', message: copy.errors.rate_limit }, blocked };
    }
    const view: FormFailureView | null = blocked
      ? { kind: 'rateLimit', message: copy.forms.failure.retryIn({ wait: clock(secondsLeft) }) }
      : null;
    return { view, blocked };
  }

  if (failure.type === 'network' || failure.type === 'timeout') {
    return {
      view: {
        kind: 'offline',
        title: copy.forms.failure.offlineTitle,
        message:
          failure.type === 'network' ? copy.forms.failure.offlineDescription : copy.errors.timeout,
        retryLabel: copy.status.retry,
        retry,
      },
      blocked,
    };
  }

  const reference =
    failure.code === undefined && failure.requestId !== undefined
      ? copy.forms.failure.reference({ id: isolated(failure.requestId) })
      : undefined;
  return {
    view: {
      kind: 'refused',
      title,
      message: copy.errors[failure.code ?? failure.type],
      ...(reference === undefined ? {} : { reference }),
    },
    blocked,
  };
}
