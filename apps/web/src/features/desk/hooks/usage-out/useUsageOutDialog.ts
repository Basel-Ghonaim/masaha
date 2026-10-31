import {
  receivePaymentSchema,
  type CheckInCheckOut,
  type ReceivePaymentRequest,
} from '@masaha/shared/desk';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import { toastPaid } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import type { PaymentMethod } from '../../types/MoneyBlockView';
import { useReceivePayment } from '../collect/useReceivePayment';
import { useMoneyBlock } from '../money/useMoneyBlock';

type Values = {
  subscriptionId: number;
  amountAgorot: number | string;
  method: PaymentMethod;
};

const twoDigits = (value: number) => String(value).padStart(2, '0');

/**
 * A usage-based subscriber's check-out (G13.4, DI10), ready to render, from the check-out's answer —
 * no quote exists for an open check-in, and the web never prices: «خرج {name}», today's stay and
 * what the subscription was paid, what it still owes (no line when nothing), and the money block
 * filled with that balance; «استلام {amount}» records it on the subscription with the opening's one
 * key (S4), «لاحقًا» closes it. Done, the toast speaks from the answer (S8).
 */
export function useUsageOutDialog({
  spaceId,
  name,
  checkOut,
  onDone,
}: {
  spaceId: number;
  name: string;
  checkOut: CheckInCheckOut;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const receive = useReceivePayment(spaceId);
  const { key } = useIntentKey();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { subscription } = checkOut;
  const due = Math.max(0, checkOut.balanceAgorot);
  const price = (agorot: number) => isolate(priceText(agorot, language));

  const form = useServerForm<Values, ReceivePaymentRequest>({
    schema: receivePaymentSchema,
    defaultValues: { subscriptionId: subscription.id, amountAgorot: due, method: 'CASH' },
    fields: ['amountAgorot'],
    prepare: (values) => ({
      subscriptionId: values.subscriptionId,
      amountAgorot: values.amountAgorot,
      method: values.method,
    }),
    submit: async (body) => {
      try {
        const answer = await receive.mutateAsync({ body, key });
        toastPaid(name, subscription.name, answer);
        onDone();
      } catch (error) {
        setRefusal(toAppError(error));
        throw error;
      }
    },
    failureTitle: words.usageOut.failed,
    fieldLines: { amountAgorot: { out_of_range: words.money.amountZero } },
    failureLines: words.refusals,
  });

  // A usage-based subscription takes more, as credit (`open`).
  const money = useMoneyBlock({ due, open: true, none: false, owesTo: name });
  const { setValue } = form.form;
  const amount = typeof money.amount === 'number' ? money.recorded : money.amount;
  const method = money.method?.value ?? 'CASH';
  useEffect(() => {
    setValue('amountAgorot', amount);
    setValue('method', method);
  }, [setValue, amount, method]);

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const out = checkOut.checkedOutAt ?? checkOut.checkedInAt;
  const minutes = Math.max(
    0,
    Math.floor((Date.parse(out) - Date.parse(checkOut.checkedInAt)) / 60_000),
  );

  return {
    title: words.usageOut.title({ name: isolate(name) }),
    today: words.usageOut.today({
      time: isolate(`${String(Math.floor(minutes / 60))}:${twoDigits(minutes % 60)}`),
      paid: price(checkOut.paidAgorot),
    }),
    left:
      checkOut.balanceAgorot > 0
        ? words.usageOut.left({ subscription: isolate(subscription.name), balance: price(due) })
        : null,
    money,
    groupLabel: words.money.group,
    submit: {
      label: words.usageOut.receive({ amount: price(money.recorded) }),
      run: send,
      busy: form.isPending,
      blocked: form.blocked || money.recorded === 0,
    },
    later: words.usageOut.later,
    failure: deskFailure(refusal, form.failure, {
      title: words.usageOut.failed,
      lost: words.failure.lost,
      nothing: words.failure.nothing,
      limited: words.failure.limited,
      retryLabel: copy.status.retry,
      retry: () => {
        send();
      },
    }),
  };
}

/** A usage-based subscriber's check-out dialog, ready to render. */
export type UsageOutDialogView = ReturnType<typeof useUsageOutDialog>;
