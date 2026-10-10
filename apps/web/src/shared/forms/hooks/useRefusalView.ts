import { useCopy, type Catalogue } from '@shared/copy';
import type { AppError } from '@shared/errors';
import type { FormFailureView } from '../types/FormFailureView';
import { clock } from '../services/clock';
import { isolated } from '../services/isolated';
import { useRetryCountdown } from './useRetryCountdown';

/** What reading a refusal needs of it: its type, its code, its reference and the wait it asked for. */
export type Refusal = Pick<AppError, 'type' | 'code' | 'requestId' | 'retryAfterSeconds'>;

/** A screen's own words for some refusals, by `code ?? type`, where it knows their cause. */
export type FailureLines = Partial<Record<keyof Catalogue['errors'], string>>;

/**
 * Reads a refusal the server answered into what the screen shows (docs/frontend/architecture.md §3):
 * - too many attempts counts down the `Retry-After` the server sent, and the view is gone when the
 *   count ends; without a `Retry-After`, it says to wait a moment;
 * - any other refusal shows `title` and the refusal's line (`code ?? type`), the caller's own from
 *   `lines` when it has one; one with no domain code also shows the request's reference, so a report
 *   can be matched to the log.
 * `blocked` holds while the count runs. The refusal is the one the caller holds, the same object from
 * one render to the next.
 */
export function useRefusalView(
  refusal: Refusal | null,
  title: string,
  lines: FailureLines = {},
): { view: FormFailureView | null; blocked: boolean } {
  const copy = useCopy();
  const secondsLeft = useRetryCountdown(refusal);
  const blocked = secondsLeft > 0;

  if (refusal === null) {
    return { view: null, blocked };
  }

  if (refusal.type === 'rate_limit') {
    if (refusal.retryAfterSeconds === undefined) {
      return { view: { kind: 'rateLimit', message: copy.errors.rate_limit }, blocked };
    }
    const view: FormFailureView | null = blocked
      ? { kind: 'rateLimit', message: copy.forms.failure.retryIn({ wait: clock(secondsLeft) }) }
      : null;
    return { view, blocked };
  }

  const reference =
    refusal.code === undefined && refusal.requestId !== undefined
      ? copy.forms.failure.reference({ id: isolated(refusal.requestId) })
      : undefined;
  return {
    view: {
      kind: 'refused',
      title,
      message: lines[refusal.code ?? refusal.type] ?? copy.errors[refusal.code ?? refusal.type],
      ...(reference === undefined ? {} : { reference }),
    },
    blocked,
  };
}
