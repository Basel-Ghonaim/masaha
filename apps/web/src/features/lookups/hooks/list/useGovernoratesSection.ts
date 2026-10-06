import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import type { SheetView } from '../../types/SheetView';
import { useGovernoratesQuery } from './useGovernoratesQuery';

/**
 * The governorates section, ready to render: its state (loading, failed, empty or the list), the
 * governorates in order, the words of each state, and the sheet that adds a governorate. Each card
 * prepares its own governorate. A failure to load is read as any refusal is, with its line, its
 * request's reference and, for too many requests, the wait, during which the retry waits too.
 */
export function useGovernoratesSection() {
  const copy = useCopy();
  const query = useGovernoratesQuery();
  const governorates = query.data ?? [];
  // A failed refetch keeps the list already loaded: only a list that never arrived is an error.
  const { view, blocked } = useRefusalView(
    query.data === undefined ? query.error : null,
    copy.lookups.governorates.loadFailed,
  );

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : governorates.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    governorates,
    add: {
      trigger: copy.lookups.governorates.add,
      title: copy.lookups.sheet.addGovernorate,
      closeLabel: copy.lookups.sheet.close,
    } satisfies SheetView,
    label: copy.lookups.governorates.title,
    loadingLabel: copy.status.loading,
    empty: {
      title: copy.lookups.governorates.empty,
      description: copy.lookups.governorates.emptyHint,
    },
    failure: {
      title: copy.lookups.governorates.loadFailed,
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
