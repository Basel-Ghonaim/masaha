import type { AppError } from '@shared/errors';
import type { FormFailureView } from '@shared/forms';

/**
 * A desk dialog's failure (DI-8): no answer (`network`, `timeout`) says the first request may have
 * landed and a retry with the same key is safe, and offers it; a refusal says nothing was recorded
 * before its reason; too many attempts keep their countdown. `refused` is the refusal as
 * `useRefusalView` read it.
 */
export function deskFailure(
  failure: AppError | null,
  refused: FormFailureView | null,
  lines: { title: string; lost: string; nothing: string; retryLabel: string; retry: () => void },
): FormFailureView | null {
  if (failure === null) return null;
  if (failure.type === 'network' || failure.type === 'timeout') {
    return {
      kind: 'offline',
      title: lines.title,
      message: lines.lost,
      retryLabel: lines.retryLabel,
      retry: lines.retry,
    };
  }
  if (refused?.kind === 'refused') {
    return { ...refused, message: `${lines.nothing} ${refused.message}` };
  }
  return refused;
}
