import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView, type FormFailureView } from '@shared/forms';
import { useState } from 'react';
import { toastDeleted } from '../../components/toast/announcementToasts';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';
import { useDeleteAnnouncement } from './useDeleteAnnouncement';

/**
 * «حذف…», ready to render (DI-18): it asks first, naming the announcement — «حذف إعلان «{type} ·
 * {period}»؟» — and the true consequence of its state now: a running closure reopens the space at
 * once, a running one leaves the space's page, an upcoming one is never seen, an ended one leaves the
 * list; none can be brought back. Sent once with no key, never again by itself (S4); a failure stays
 * in the dialog — `CLOSURE_EXTENDED` worded and the list read again, a 404 or a 403 worded, no answer
 * with «إعادة المحاولة». Done, its toast says so and `onDone` closes it.
 */
export function useDeleteDialog({
  spaceId,
  card,
  onDone,
}: {
  spaceId: number;
  card: AnnouncementCardView;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.announcements.delete;
  const deleting = useDeleteAnnouncement(spaceId);
  const { settle } = useAnnouncementsWrite();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view } = useRefusalView(refusal, words.failed, {
    not_found: copy.announcements.sheet.gone,
    forbidden: copy.desk.refusals.forbidden,
  });
  const { announcement } = card;

  const run = () => {
    setRefusal(null);
    deleting.mutateAsync(announcement.id).then(
      () => {
        toastDeleted();
        onDone();
      },
      (error: unknown) => {
        const failure = toAppError(error);
        if (failure.status === 404 || failure.status === 409) settle(spaceId);
        setRefusal(failure);
      },
    );
  };

  const failure: FormFailureView | null =
    refusal !== null && (refusal.type === 'network' || refusal.type === 'timeout')
      ? {
          kind: 'offline',
          title: words.failed,
          message: copy.errors[refusal.type],
          retryLabel: copy.status.retry,
          retry: run,
        }
      : view;

  return {
    title: words.title({ type: card.type.label, period: card.period }),
    text:
      announcement.state === 'RUNNING'
        ? announcement.type === 'CLOSURE'
          ? words.runningClosure
          : words.running
        : announcement.state === 'UPCOMING'
          ? words.upcoming
          : words.ended,
    back: words.back,
    confirm: { label: words.confirm, run, busy: deleting.isPending },
    failure,
  };
}

/** «حذف…», ready to render. */
export type DeleteDialogView = ReturnType<typeof useDeleteDialog>;
