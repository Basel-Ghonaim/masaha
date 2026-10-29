import type { AnnouncementState } from '@masaha/shared/announcements';
import { useCopy } from '@shared/copy';
import { toAppError } from '@shared/errors';
import type { FailureLines } from '@shared/forms';
import {
  toastActionFailed,
  toastEnded,
  toastStarted,
} from '../../components/toast/announcementToasts';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';
import { useEndNow } from './useEndNow';
import { useStartNow } from './useStartNow';

const repository = createAnnouncementsRepository();

/**
 * A card's actions by its state (DI-17), ready to render: «إنهاء الآن» on a running one, «ابدأ الآن» on
 * an upcoming one, and the «⋯» menu, named by the announcement, with «حذف…» in any state but an
 * extended closure, whose line says why (`lock`): it is neither deleted nor ended later. No action
 * that cannot apply is offered (finding 105).
 *
 * Each is sent once with no key, never again by itself (S4); the whole space is read again once done
 * (S12). End now acts at once: its toast names «منتهية» and offers «تراجع», one `PATCH` of the old end,
 * except on an extended closure, where the server would refuse a later end (`CLOSURE_EXTENDED`).
 * Start now's toast names «نشطة» with «عرض» (DI-24). A failure is an error toast with its line and
 * «إعادة المحاولة»; a 404 or a 409 reads the list again.
 */
export function useAnnouncementActions(
  spaceId: number,
  card: AnnouncementCardView,
  { showTab }: { showTab: (state: AnnouncementState) => void },
) {
  const copy = useCopy();
  const words = copy.announcements;
  const ending = useEndNow(spaceId);
  const starting = useStartNow(spaceId);
  const { settle, linkEnded } = useAnnouncementsWrite();
  const { announcement } = card;
  const extended = announcement.type === 'CLOSURE' && (announcement.extension ?? null) !== null;

  const failed = (error: unknown, lines: FailureLines, retry: () => void) => {
    const failure = toAppError(error);
    // Gone, or moved meanwhile: the list is read again, so it shows the truth.
    if (failure.status === 404 || failure.status === 409) settle(spaceId);
    toastActionFailed(failure, { lines, retry });
  };
  const forbidden = { forbidden: copy.desk.refusals.forbidden };

  const end = () => {
    ending.mutateAsync(announcement.id).then(
      () => {
        toastEnded({
          closure: announcement.type === 'CLOSURE',
          // The old end given back, once; its answer read as any write's.
          undo: extended
            ? null
            : () =>
                repository.edit(spaceId, announcement.id, { endsAt: announcement.endsAt }).then(
                  () => {
                    settle(spaceId);
                  },
                  (error: unknown) => {
                    const failure = toAppError(error);
                    linkEnded(failure);
                    settle(spaceId);
                    throw failure;
                  },
                ),
          showTab,
        });
      },
      (error: unknown) => {
        failed(error, forbidden, end);
      },
    );
  };
  const start = () => {
    starting.mutateAsync(announcement.id).then(
      () => {
        toastStarted(showTab);
      },
      (error: unknown) => {
        // A start would put its end past 365 days from now: the end is edited first.
        failed(error, { ...forbidden, validation: words.actions.startTooLong }, start);
      },
    );
  };

  return {
    end:
      announcement.state === 'RUNNING'
        ? { label: words.actions.end, run: end, busy: ending.isPending }
        : null,
    start:
      announcement.state === 'UPCOMING'
        ? { label: words.actions.start, run: start, busy: starting.isPending }
        : null,
    menu: {
      label: words.actions.more({ type: card.type.label, period: card.period }),
      remove: extended ? null : { label: words.actions.delete },
    },
    /** An extended closure's line: why it has no delete and no later end (DI-17). */
    lock: extended ? words.closure.extendedLock : null,
  };
}

/** A card's actions, ready to render. */
export type AnnouncementActionsView = ReturnType<typeof useAnnouncementActions>;
