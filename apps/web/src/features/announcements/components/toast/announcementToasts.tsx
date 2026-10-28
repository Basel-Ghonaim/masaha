import type { AnnouncementState } from '@masaha/shared/announcements';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';

/**
 * Says an announcement was published or saved, and the tab it is in now (DI-24), with «عرض», which
 * opens that tab (`showTab`): an announcement that went to another tab is never lost from sight.
 */
export function toastWritten(
  title: 'published' | 'saved',
  state: AnnouncementState,
  showTab: (state: AnnouncementState) => void,
) {
  const words = currentCopy().announcements;
  toast.success(words.toast[title], {
    description: words.toast.inTab({ tab: words.tabs[state] }),
    action: {
      label: words.toast.show,
      onClick: () => {
        showTab(state);
      },
    },
  });
}
