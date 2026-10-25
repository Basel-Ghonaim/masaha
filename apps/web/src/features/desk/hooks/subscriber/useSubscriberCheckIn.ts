import type { CustomerRow } from '@masaha/shared/desk';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { toastCheckedIn, toastFailed, toastSubscriberIn } from '../../components/toast/deskToasts';
import { dayText } from '../../services/dayText';
import { deskFailure } from '../../services/deskRefusal';
import { useCheckInVisit } from '../check-in/useCheckInVisit';
import { useCustomerFileQuery } from '../file/useCustomerFileQuery';
import { useCheckInSubscriber } from './useCheckInSubscriber';

/**
 * A customer's «حضور», ready to render. On a current subscription that runs (active, or ending
 * soon) one tap checks them in at once; on none, an expired one or one not started, the tap opens the
 * choice first, as the row already says it (DI-14, S6): «تسجيل كزيارة» — a visit by their name, its
 * own intent, which is not added to their file (finding 160) — and «تسجيل على أي حال» on the
 * subscription, not offered with none. A subscriber's check-in keeps one key until it lands, across
 * the transport's re-sends and a retry after a lost answer (S4); the next check-in is a new one. The
 * server's warnings are said after, in the toast; `MEMBER_ALREADY_CHECKED_IN` says they are here.
 * Done, `done` runs (the search: cleared and focused, S10).
 */
export function useSubscriberCheckIn(
  spaceId: number,
  row: CustomerRow,
  { done }: { done: () => void },
) {
  const copy = useCopy();
  const words = copy.desk.subscriber;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const subscriber = useCheckInSubscriber(spaceId);
  const visit = useCheckInVisit(spaceId);
  const subscriberKey = useIntentKey();
  const visitKey = useIntentKey();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<'visit' | 'subscriber'>('subscriber');
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { current } = row;
  const runs = current?.status === 'ACTIVE' || current?.status === 'ENDING_SOON';
  // A subscription not started: its start date is the file's (the row carries its end only).
  const upcoming = open && current?.status === 'UPCOMING';
  const file = useCustomerFileQuery(spaceId, upcoming ? row.id : null);
  const startsOn =
    file.data?.subscriptions.find((subscription) => subscription.id === current?.id)?.startsOn ??
    null;

  const name = isolate(row.name);
  const lines = {
    ...copy.desk.refusals,
    MEMBER_ALREADY_CHECKED_IN: words.in.alreadyHere({ name }),
  };
  const { view } = useRefusalView(refusal, words.in.failed, lines);
  const busy = subscriber.isPending || visit.isPending;

  const checkInSubscriber = async (inDialog: boolean) => {
    if (current === null || busy) return;
    setLast('subscriber');
    setRefusal(null);
    try {
      const answer = await subscriber.mutateAsync({
        body: { subscriptionId: current.id },
        key: subscriberKey.key,
      });
      subscriberKey.renew();
      setOpen(false);
      toastSubscriberIn(row.name, answer.meta?.warnings);
      done();
    } catch (error) {
      const failure = toAppError(error);
      if (inDialog) {
        setRefusal(failure);
        return;
      }
      toastFailed(words.in.failed, failure, {
        lines,
        retry: () => void checkInSubscriber(false),
      });
    }
  };
  const checkInVisit = async () => {
    if (busy) return;
    setLast('visit');
    setRefusal(null);
    try {
      const answer = await visit.mutateAsync({
        body: { visitorName: row.name, audience: 'GENERAL' },
        key: visitKey.key,
      });
      setOpen(false);
      toastCheckedIn(row.name, answer.meta?.warnings);
      done();
    } catch (error) {
      setRefusal(toAppError(error));
    }
  };

  const reason =
    current === null
      ? words.pre.none
      : current.status === 'EXPIRED'
        ? words.pre.expired({
            name: isolate(current.name),
            date: current.endsOn === null ? '' : isolate(dayText(current.endsOn, language)),
          })
        : startsOn === null
          ? null
          : words.pre.upcoming({
              name: isolate(current.name),
              date: isolate(dayText(startsOn, language)),
            });

  return {
    tap: {
      label: copy.desk.customer.checkIn,
      name: copy.desk.customer.checkInName({ name }),
      busy: busy && !open,
      run: () => {
        if (runs) {
          void checkInSubscriber(false);
          return;
        }
        // A new opening is a new visit's intent; the subscriber's key stays until it lands.
        visitKey.renew();
        setRefusal(null);
        setOpen(true);
      },
    },
    dialog: {
      open,
      title: words.pre.title({ name }),
      /** Why it asks; `null` while a coming subscription's start is read. */
      reason,
      asVisit: {
        label: words.pre.asVisit,
        note: words.pre.asVisitNote,
        run: () => void checkInVisit(),
      },
      anyway:
        current === null
          ? null
          : { label: words.pre.anyway, run: () => void checkInSubscriber(true) },
      back: {
        label: words.pre.back,
        run: () => {
          if (!busy) setOpen(false);
        },
      },
      busy,
      failure: deskFailure(refusal, view, {
        title: words.in.failed,
        lost: copy.desk.failure.lost,
        nothing: copy.desk.failure.nothing,
        retryLabel: copy.status.retry,
        retry: () => {
          if (last === 'visit') void checkInVisit();
          else void checkInSubscriber(true);
        },
      }),
    },
  };
}

/** A customer's «حضور» and its choice, ready to render. */
export type SubscriberCheckInView = ReturnType<typeof useSubscriberCheckIn>;
