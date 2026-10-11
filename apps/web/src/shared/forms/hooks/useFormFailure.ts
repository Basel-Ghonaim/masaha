import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import type { FormFailureView } from '../types/FormFailureView';
import { useRefusalView, type FailureLines } from './useRefusalView';

/**
 * Reads a form's failure into what the form shows (docs/frontend/architecture.md §3):
 * - no connection, or no answer in time, offers `retry`;
 * - a refusal the server answered reads as `useRefusalView` reads it: too many attempts counts down
 *   its `Retry-After`, and any other refusal shows `title` and the failure's line, the form's own
 *   from `lines` when it has one.
 * `blocked` holds while the count runs: the form keeps its submit disabled until it ends. The failure
 * is the one the form holds, the same object from one render to the next.
 */
export function useFormFailure(
  failure: AppError | null,
  { title, retry, lines }: { title: string; retry: () => void; lines?: FailureLines },
): { view: FormFailureView | null; blocked: boolean } {
  const copy = useCopy();
  const refusal = useRefusalView(failure, title, lines);

  if (failure?.type === 'network' || failure?.type === 'timeout') {
    return {
      view: {
        kind: 'offline',
        title: copy.forms.failure.offlineTitle,
        message:
          failure.type === 'network' ? copy.forms.failure.offlineDescription : copy.errors.timeout,
        retryLabel: copy.status.retry,
        retry,
      },
      blocked: refusal.blocked,
    };
  }

  return refusal;
}
