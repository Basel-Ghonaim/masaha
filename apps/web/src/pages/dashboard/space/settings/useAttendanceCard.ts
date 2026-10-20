import { useCapacityQuery } from '@features/occupancy';
import { useSpaceSettingsQuery } from '@features/space-settings';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';

/**
 * The «الحضور والحالة المباشرة» card's values, composed here from two capabilities (S8): the
 * capacity, `occupancy`'s, and the settings, `space-settings`'. While either loads, it says so. A
 * capacity that cannot be read is said here, with its retry; settings that cannot be read are said
 * once, by the settings' own cards below, which read the same query, so the card then draws nothing.
 */
export function useAttendanceCard(spaceId: number) {
  const copy = useCopy();
  const capacity = useCapacityQuery(spaceId);
  const settings = useSpaceSettingsQuery(spaceId);
  const capacityFailed = capacity.data === undefined && !capacity.isPending;
  const { view, blocked } = useRefusalView(
    capacityFailed ? capacity.error : null,
    copy.spaceSettings.loadFailed,
  );

  if (capacity.data !== undefined && settings.data !== undefined) {
    return {
      status: 'ready' as const,
      capacity: capacity.data.capacity,
      settings: settings.data,
    };
  }
  if (capacityFailed) {
    return {
      status: 'error' as const,
      failure: {
        title: copy.spaceSettings.loadFailed,
        message: view?.message,
        reference: view?.kind === 'refused' ? view.reference : undefined,
        retryLabel: copy.status.retry,
        blocked,
        retry: () => {
          void capacity.refetch();
          if (settings.data === undefined) void settings.refetch();
        },
      },
    };
  }
  if (settings.data === undefined && !settings.isPending)
    return { status: 'settingsFailed' as const };
  return { status: 'loading' as const, label: copy.status.loading };
}
