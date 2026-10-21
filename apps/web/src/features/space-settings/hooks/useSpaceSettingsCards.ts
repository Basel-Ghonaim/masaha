import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { useSpaceSettingsQuery } from './useSpaceSettingsQuery';

/**
 * The settings cards' state, ready to render: loading, failed with its reference and a retry, or
 * the settings each card starts from. A failed refetch keeps the settings already read.
 */
export function useSpaceSettingsCards(spaceId: number) {
  const copy = useCopy();
  const words = copy.spaceSettings;
  const query = useSpaceSettingsQuery(spaceId);
  const { view, blocked } = useRefusalView(
    query.data === undefined ? query.error : null,
    words.loadFailed,
  );

  if (query.data !== undefined) return { status: 'ready' as const, settings: query.data };
  if (query.isPending) return { status: 'loading' as const, loadingLabel: copy.status.loading };
  return {
    status: 'error' as const,
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
  };
}
