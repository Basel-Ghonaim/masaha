import { voidPaymentSchema, type VoidPaymentRequest } from '@masaha/shared/payments';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { dayWord, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState, type BaseSyntheticEvent } from 'react';
import { toastVoided } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import type { VoidTarget } from '../../types/VoidTarget';
import { useDeskWrite } from '../useDeskWrite';
import { useVoidPayment } from './useVoidPayment';

type Values = { reason: string };

/**
 * The owner's «إلغاء الدفعة…», ready to render (DI-7): the amount, who, the day and the method, and
 * the void's true consequence; its reason, required. Sent once, with no key, never again by itself
 * (S4): no answer says a retry is safe. A written-off visit's payment, a payment gone (the space read
 * again) and a 403 (the user's spaces read again) are each worded (DI-12).
 */
export function useVoidDialog({
  spaceId,
  payment,
  onDone,
}: {
  spaceId: number;
  payment: VoidTarget;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk.void;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const voiding = useVoidPayment(spaceId, payment.id);
  const { settle } = useDeskWrite();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const amount = isolate(priceText(payment.amountAgorot, language));
  const who = isolate(payment.who);

  const form = useServerForm<Values, VoidPaymentRequest>({
    schema: voidPaymentSchema,
    defaultValues: { reason: '' },
    fields: ['reason'],
    // A blank reason is no reason: `required`, as the server says it.
    prepare: (values) => ({ reason: values.reason.trim() === '' ? undefined : values.reason }),
    submit: async (body) => {
      try {
        await voiding.mutateAsync(body);
        toastVoided(payment);
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        // A payment gone, or refused for its state: the lists are read again, so they show the truth.
        if (failure.status === 404 || failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.failed,
    fieldLines: { reason: { required: words.reasonRequired } },
    failureLines: {
      ...copy.desk.refusals,
      VISIT_WRITTEN_OFF: words.refusals.VISIT_WRITTEN_OFF,
      not_found: words.refusals.not_found,
    },
  });

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const failure = deskFailure(refusal, form.failure, {
    title: words.failed,
    lost: words.lost,
    nothing: words.nothing,
    retryLabel: copy.status.retry,
    retry: () => {
      send();
    },
  });

  return {
    title: words.title,
    text: words.text({
      amount,
      who,
      day: dayWord(payment.receivedAt, new Date(), language, copy.desk.uncollected),
      method: copy.desk.money.methods[payment.method],
    }),
    reason: {
      label: words.reason,
      field: form.field('reason'),
      error: form.errors.reason,
    },
    back: words.back,
    submit: {
      label: words.confirm,
      run: send,
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure,
  };
}

/** The owner's void of a payment, ready to render. */
export type VoidDialogView = ReturnType<typeof useVoidDialog>;
