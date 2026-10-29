import type { AnnouncementState } from '@masaha/shared/announcements';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { RefusalText, type FailureLines } from '@shared/forms';

/** The line naming the tab an announcement is in now (DI-24). */
const inTab = (state: AnnouncementState) => {
  const words = currentCopy().announcements;
  return words.toast.inTab({ tab: words.tabs[state] });
};

/** «عرض», which opens the tab an announcement went to. */
const showAction = (state: AnnouncementState, showTab: (state: AnnouncementState) => void) => ({
  label: currentCopy().announcements.toast.show,
  onClick: () => {
    showTab(state);
  },
});

/**
 * Says an announcement was published or saved, and the tab it is in now (DI-24), with «عرض», which
 * opens that tab (`showTab`): an announcement that went to another tab is never lost from sight.
 */
export function toastWritten(
  title: 'published' | 'saved',
  state: AnnouncementState,
  showTab: (state: AnnouncementState) => void,
) {
  toast.success(currentCopy().announcements.toast[title], {
    description: inTab(state),
    action: showAction(state, showTab),
  });
}

/**
 * Says an announcement was ended now — a closure's end says the status is automatic again — and that
 * it is in «منتهية». Its «تراجع» (`undo`, DI-17) gives it back its end, sent once, and says whether it
 * was; with none (an extended closure, whose end may only come earlier), «عرض» opens the tab.
 */
export function toastEnded({
  closure,
  undo,
  showTab,
}: {
  closure: boolean;
  undo: (() => Promise<unknown>) | null;
  showTab: (state: AnnouncementState) => void;
}) {
  const words = currentCopy().announcements.actions;
  toast.success(closure ? words.closureEnded : words.ended, {
    description: inTab('ENDED'),
    action:
      undo === null
        ? showAction('ENDED', showTab)
        : {
            label: words.undo,
            onClick: () => {
              undo().then(
                () => {
                  toast.success(currentCopy().announcements.actions.undone);
                },
                (error: unknown) => {
                  const failed = currentCopy().announcements.actions.undoFailed;
                  toast.error(failed, {
                    description: <RefusalText refusal={toAppError(error)} title={failed} />,
                  });
                },
              );
            },
          },
  });
}

/** Says an announcement started now, and that it is in «نشطة», with «عرض». */
export function toastStarted(showTab: (state: AnnouncementState) => void) {
  toast.success(currentCopy().announcements.actions.started, {
    description: inTab('RUNNING'),
    action: showAction('RUNNING', showTab),
  });
}

/** Says an announcement was deleted. */
export function toastDeleted() {
  toast.success(currentCopy().announcements.delete.done);
}

/**
 * Says an action with no dialog failed, with why (`lines`, the screen's own first) and «إعادة
 * المحاولة», which sends it again once: each of these writes is idempotent by design. It stays until
 * it is closed.
 */
export function toastActionFailed(
  failure: AppError,
  { lines, retry }: { lines: FailureLines; retry: () => void },
) {
  const copy = currentCopy();
  const title = copy.announcements.actions.failed;
  toast.error(title, {
    description: <RefusalText refusal={failure} title={title} lines={lines} />,
    // It stays until it is closed or its retry pressed: it is the only way to send it again.
    duration: Infinity,
    action: { label: copy.status.retry, onClick: retry },
  });
}
