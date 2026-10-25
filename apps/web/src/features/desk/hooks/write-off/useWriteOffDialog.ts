import { writeOffVisitSchema, type WriteOffVisitRequest } from '@masaha/shared/visits';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState, type BaseSyntheticEvent } from 'react';
import { toastWrittenOff } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import type { UncollectedItem } from '../../types/UncollectedItem';
import { useDeskWrite } from '../useDeskWrite';
import { useUndoWriteOff } from './useUndoWriteOff';
import { useWriteOff } from './useWriteOff';

type Values = { reason: string };

/**
 * The owner's «لن يُحصَّل…» of an uncollected visit, ready to render: who, when and how much, what the
 * write-off is and is not (DI-9), and its reason, required. Sent once, with no key, never again by
 * itself (S3, finding 115). Done, its toast stays until it is closed with «تراجع» (DI-29), which
 * undoes it once — no screen lists a written-off visit after it (finding 164).
 */
export function useWriteOffDialog({
  spaceId,
  item,
  onDone,
}: {
  spaceId: number;
  item: UncollectedItem;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const { visit, balanceAgorot } = item.uncollected;
  const writeOff = useWriteOff(spaceId, visit.id);
  const undo = useUndoWriteOff(spaceId, visit.id);
  const { settle } = useDeskWrite();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const amount = isolate(priceText(balanceAgorot ?? 0, language));

  const form = useServerForm<Values, WriteOffVisitRequest>({
    schema: writeOffVisitSchema,
    defaultValues: { reason: '' },
    fields: ['reason'],
    // A blank reason is no reason: `required`, as the server says it.
    prepare: (values) => ({ reason: values.reason.trim() === '' ? undefined : values.reason }),
    submit: async (body) => {
      try {
        await writeOff.mutateAsync(body);
        toastWrittenOff(item, balanceAgorot ?? 0, () => undo.mutateAsync());
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        if (failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.writeOff.failed,
    fieldLines: { reason: { required: words.writeOff.reasonRequired } },
    failureLines: words.refusals,
  });

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const failure = deskFailure(refusal, form.failure, {
    title: words.writeOff.failed,
    lost: words.failure.lost,
    nothing: words.failure.nothing,
    retryLabel: copy.status.retry,
    retry: () => {
      send();
    },
  });

  return {
    title: words.writeOff.title,
    text: words.writeOff.text({ who: isolate(item.name), day: item.day, amount }),
    reason: {
      label: words.writeOff.reason,
      field: form.field('reason'),
      error: form.errors.reason,
    },
    back: words.writeOff.back,
    submit: {
      label: words.writeOff.confirm,
      run: send,
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure,
  };
}

/** The owner's write-off of an uncollected visit, ready to render. */
export type WriteOffDialogView = ReturnType<typeof useWriteOffDialog>;
