import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';

/**
 * A finance tab's failure to load, ready to render: offline when no answer came back (P7's offline
 * state, its own icon and words), else the destructive alert «تعذّر تحميل المالية» with the refusal's
 * line; each with «إعادة المحاولة», held while a 429's wait runs.
 */
export function useLoadFailure(error: AppError | null, retry: () => void) {
  const copy = useCopy();
  const title = copy.finance.loadFailed;
  const { view, blocked } = useRefusalView(error, title);
  const offline = error?.type === 'network';

  return {
    offline,
    title: offline ? copy.status.offline.title : title,
    message: offline ? copy.status.offline.description : view?.message,
    reference: view?.kind === 'refused' ? view.reference : undefined,
    retryLabel: copy.status.retry,
    blocked,
    retry,
  };
}

/** A finance tab's failure to load, ready to render. */
export type LoadFailureView = ReturnType<typeof useLoadFailure>;
