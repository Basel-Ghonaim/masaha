import {
  extendSubscriptionsSchema,
  type ExtendSubscriptionsRequest,
  type ManagedAnnouncement,
} from '@masaha/shared/announcements';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView, useServerForm, type FormFailureView } from '@shared/forms';
import { dayText, wholeNumberOf } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useRef, useState, type BaseSyntheticEvent } from 'react';
import { useAnnouncementsWrite } from '../useAnnouncementsWrite';
import { useExtendSubscriptions } from './useExtendSubscriptions';
import { useExtensionPreviewQuery } from './useExtensionPreviewQuery';

type Values = { days: string };

/**
 * «تمديد الاشتراكات», the owner's, on a closure that has started and is not extended (O11), ready to
 * render. It reads the preview at each opening: the closure's Gaza days, the days proposed and how
 * many subscriptions the extension would move now — those it covered and their renewals not started
 * (#128). The days are typed (1–365, Arabic digits read), prefilled with the proposal (DI-20); the
 * typed days are sent, with one `Idempotency-Key` per opening (S4), kept across the transport's
 * re-sends and «إعادة المحاولة». A failure stays in the dialog, the days kept (DI-19):
 * `CLOSURE_ALREADY_EXTENDED` (the list read again: the card then shows the extension),
 * `ANNOUNCEMENT_NOT_STARTED`, a 403 and no answer, each worded. A closure that covered none offers no
 * extension (S11), and one extended meanwhile says so: each with «رجوع» only. Done, its toast says how
 * many and by how many days, and `onDone` closes it.
 */
export function useExtensionDialog({
  spaceId,
  closure,
  onDone,
}: {
  spaceId: number;
  closure: ManagedAnnouncement;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.announcements.extension;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  // One key for this opening: the dialog is mounted anew for each one.
  const { key } = useIntentKey();
  const preview = useExtensionPreviewQuery(spaceId, closure.id);
  const extending = useExtendSubscriptions(spaceId, closure.id);
  const { settle } = useAnnouncementsWrite();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const answer = preview.data;
  const load = useRefusalView(answer === undefined ? preview.error : null, words.loadFailed);
  const count = (n: number) => words.count({ count: n });
  const dayCount = (n: number) => words.dayCount({ count: n });
  const applied = answer?.applied ?? null;

  const form = useServerForm<Values, ExtendSubscriptionsRequest>({
    schema: extendSubscriptionsSchema,
    defaultValues: { days: '' },
    fields: ['days'],
    prepare: (values) => ({ days: wholeNumberOf(values.days) }),
    submit: async (body) => {
      try {
        const done = await extending.mutateAsync({ body, key });
        toast.success(words.done, {
          description: words.doneText({
            count: count(done.subscriptions),
            days: dayCount(done.days),
          }),
        });
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        // Extended or moved meanwhile: the list is read again, so the card shows the truth.
        if (failure.status === 404 || failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.failed,
    fieldLines: {
      days: {
        out_of_range: words.daysRange,
        required: words.daysRange,
        invalid_format: words.daysRange,
      },
    },
    failureLines: { forbidden: copy.desk.refusals.forbidden },
  });

  // The days prefilled with the proposal once it arrives, unless already typed.
  const { setValue, getFieldState } = form.form;
  const prefilled = useRef(false);
  const proposed = answer?.proposedDays;
  useEffect(() => {
    if (proposed === undefined || prefilled.current) return;
    prefilled.current = true;
    if (!getFieldState('days').isDirty) setValue('days', String(proposed));
  }, [proposed, setValue, getFieldState]);

  const run = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  // No answer: it may have been applied, and its key makes a retry safe.
  const failure: FormFailureView | null =
    refusal !== null && (refusal.type === 'network' || refusal.type === 'timeout')
      ? {
          kind: 'offline',
          title: words.failed,
          message: words.lost,
          retryLabel: copy.status.retry,
          retry: () => {
            run();
          },
        }
      : form.failure;

  return {
    state: preview.isPending
      ? ('loading' as const)
      : answer === undefined
        ? ('failed' as const)
        : applied !== null
          ? ('applied' as const)
          : answer.subscriptions === 0
            ? ('none' as const)
            : ('ready' as const),
    title: words.title,
    covered: answer === undefined ? null : words.covered({ count: answer.subscriptions }),
    text: words.text,
    days: {
      label: words.days,
      helper:
        answer === undefined
          ? null
          : words.daysHelper({
              days: dayCount(answer.proposedDays),
              first: isolate(dayText(answer.firstDay, language)),
              last: isolate(dayText(answer.lastDay, language)),
            }),
      field: form.field('days'),
      error: form.errors.days,
    },
    submit: {
      label: words.submit({ count: answer?.subscriptions ?? 0 }),
      run,
      busy: form.isPending,
      blocked: form.blocked,
    },
    back: words.back,
    failure,
    loadFailure:
      answer === undefined && load.view !== null
        ? {
            title: words.loadFailed,
            message: load.view.message,
            retryLabel: copy.status.retry,
            blocked: load.blocked,
            retry: () => {
              void preview.refetch();
            },
          }
        : null,
    none: words.none,
    applied:
      applied === null
        ? null
        : words.applied({ count: count(applied.subscriptions), days: dayCount(applied.days) }),
  };
}

/** «تمديد الاشتراكات», ready to render. */
export type ExtensionDialogView = ReturnType<typeof useExtensionDialog>;
