import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import type { ListFailureView } from '../../types/DirectoryListView';

/**
 * A failed read of the directory, the list's or the map's, read as any refusal is: no connection or
 * no answer says so, any other with its request's reference; too many requests counts down its
 * wait, then offers the retry again. None while `error` is.
 */
export function useFailureView(
  error: AppError | null,
  title: string,
  retry: () => void,
): ListFailureView | null {
  const copy = useCopy();
  const refusal = useRefusalView(error, title);
  if (error === null) return null;
  return {
    title,
    // Too many requests' view is gone once its count ends; the failure stays, with its retry.
    line: refusal.view?.message ?? copy.errors.rate_limit,
    reference: refusal.view?.kind === 'refused' ? (refusal.view.reference ?? null) : null,
    retry: { label: copy.status.retry, blocked: refusal.blocked, run: retry },
  };
}
