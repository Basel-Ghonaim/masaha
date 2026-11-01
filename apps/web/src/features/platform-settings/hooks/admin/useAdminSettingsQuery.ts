import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { useQuery } from '@tanstack/react-query';
import type { CardLoadView } from '../../types/CardLoadView';
import { platformSettingsKeys, type AdminSettingsCard } from '../queryKeys';

/**
 * One of the admin's cards, read by its own `GET` (AD-029): its saved values once read, and, until
 * then, its own skeleton or its own failure with «إعادة المحاولة», so one card's failure never
 * touches another's.
 */
export function useAdminSettingsQuery<T>({
  card,
  title,
  description,
  read,
}: {
  card: AdminSettingsCard;
  title: string;
  description: string;
  read: () => Promise<T>;
}): { saved: T | undefined; load: CardLoadView } {
  const copy = useCopy();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<T, AppError>({
    queryKey: platformSettingsKeys.admin(card),
    queryFn: read,
  });
  const loadFailed = copy.platformSettings.admin.loadFailed({ card: title });
  const { view, blocked } = useRefusalView(
    result.data === undefined ? result.error : null,
    loadFailed,
  );
  return {
    saved: result.data,
    load: {
      id: card,
      title,
      description,
      state: result.isPending ? 'loading' : 'failed',
      failure: {
        title: loadFailed,
        message: view?.message,
        retryLabel: copy.status.retry,
        blocked,
        retry: () => {
          void result.refetch();
        },
      },
    },
  };
}
