import { priceVisitSchema, type DeskVisit, type PriceVisitRequest } from '@masaha/shared/visits';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { agorotOf } from '@shared/lib';
import { isolate } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type BaseSyntheticEvent } from 'react';
import { toastPriced } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import { deskKeys } from '../queryKeys';
import { useDeskWrite } from '../useDeskWrite';
import { usePriceVisit } from './usePriceVisit';

type Values = { amountAgorot: string; reason: string };

/**
 * «تحديد السعر» of an unpriced visit, ready to render: the amount, focused first, and its reason, both
 * required (DI-10), in the check-out's words. Sent once (S3); a `PRICE_TYPING_NOT_ALLOWED` reads the
 * terms again, so the card goes for whoever may no longer type a price. Done, the toast says the
 * price the answer holds (S8) and `onDone` closes it.
 */
export function usePriceDialog({
  spaceId,
  visit,
  name,
  onDone,
}: {
  spaceId: number;
  visit: DeskVisit;
  name: string;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk;
  const client = useQueryClient();
  const price = usePriceVisit(spaceId, visit.id);
  const { settle } = useDeskWrite();
  const [refusal, setRefusal] = useState<AppError | null>(null);

  const form = useServerForm<Values, PriceVisitRequest>({
    schema: priceVisitSchema,
    defaultValues: { amountAgorot: '', reason: '' },
    fields: ['amountAgorot', 'reason'],
    // The amount is typed in shekels; a blank reason is no reason (`required`).
    prepare: (values) => ({
      amountAgorot: values.amountAgorot.trim() === '' ? undefined : agorotOf(values.amountAgorot),
      reason: values.reason.trim() === '' ? undefined : values.reason,
    }),
    submit: async (body) => {
      try {
        const answer = await price.mutateAsync(body);
        toastPriced(name, answer);
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        if (failure.code === 'PRICE_TYPING_NOT_ALLOWED') {
          void client.invalidateQueries({ queryKey: deskKeys.terms(spaceId) });
        }
        if (failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.unpriced.failed,
    fieldLines: {
      amountAgorot: {
        invalid_format: words.money.amountInvalid,
        out_of_range: words.money.amountZero,
      },
    },
    failureLines: words.refusals,
  });

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const failure = deskFailure(refusal, form.failure, {
    title: words.unpriced.failed,
    lost: words.failure.lost,
    nothing: words.failure.nothing,
    retryLabel: copy.status.retry,
    retry: () => {
      send();
    },
  });

  return {
    title: words.unpriced.dialogTitle({ name: isolate(name) }),
    badge: words.checkOut.typed.badge,
    amount: {
      label: words.checkOut.typed.amount,
      field: form.field('amountAgorot'),
      error: form.errors.amountAgorot,
    },
    reason: {
      label: words.checkOut.typed.reason,
      field: form.field('reason'),
      error: form.errors.reason,
    },
    submit: {
      label: words.unpriced.submit,
      run: send,
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure,
  };
}

/** «تحديد السعر» of an unpriced visit, ready to render. */
export type PriceDialogView = ReturnType<typeof usePriceDialog>;
