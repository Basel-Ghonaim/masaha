import { gazaClockOf } from '@masaha/shared/core';
import type { SubscriptionWithMoney } from '@masaha/shared/desk';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { dayText } from '@shared/lib';
import { deskFailure } from '../../services/deskRefusal';
import { useEndSubscription } from './useEndSubscription';

/**
 * «إنهاء الاشتراك» on a subscription's card, ready to render: offered while it is not ended nor
 * expired; it asks first, in an `AlertDialog`, the end it will take — today on Gaza's clock, or its
 * start if it has not started — and the end it had, and that what is paid and owed does not change.
 * Sent once with no key, never again by itself (S3); done, the toast names it from the answer, and
 * the file is read again (S2).
 */
export function useEndDialog({
  spaceId,
  subscription,
}: {
  spaceId: number;
  subscription: SubscriptionWithMoney;
}) {
  const copy = useCopy();
  const words = copy.desk.end;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const end = useEndSubscription(spaceId, subscription.id);
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view } = useRefusalView(refusal, words.failed, copy.desk.refusals);

  const day = (date: string) => isolate(dayText(date, language));
  const today = gazaClockOf(new Date()).date;
  const { startsOn, endsOn } = subscription;
  // The server's rule, said before it is sent: today, its start if not started, never past its end.
  const newEnd =
    startsOn !== null && startsOn > today
      ? startsOn
      : endsOn !== null && endsOn < today
        ? endsOn
        : today;
  const name = isolate(subscription.name);

  const run = () => {
    if (end.isPending) return;
    setRefusal(null);
    end.mutateAsync().then(
      (ended) => {
        setOpen(false);
        toast.success(words.done({ name: isolate(ended.name) }));
      },
      (error: unknown) => {
        setRefusal(toAppError(error));
      },
    );
  };

  return {
    action:
      subscription.ended === null && subscription.status !== 'EXPIRED'
        ? {
            label: words.action,
            run: () => {
              setRefusal(null);
              setOpen(true);
            },
          }
        : null,
    dialog: {
      open,
      title: words.title,
      text:
        endsOn === null || endsOn === newEnd
          ? words.text({ name, end: day(newEnd) })
          : words.textWas({ name, end: day(newEnd), was: day(endsOn) }),
      confirm: words.confirm,
      back: words.back,
      busy: end.isPending,
      failure: deskFailure(refusal, view, {
        title: words.failed,
        lost: copy.desk.failure.lost,
        nothing: copy.desk.failure.nothing,
        retryLabel: copy.status.retry,
        retry: run,
      }),
      run,
      close: () => {
        if (!end.isPending) setOpen(false);
      },
    },
  };
}

/** «إنهاء الاشتراك», ready to render. */
export type EndDialogView = ReturnType<typeof useEndDialog>;
