import { receivePaymentSchema, type ReceivePaymentRequest } from '@masaha/shared/desk';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { AppError, toAppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { toastCollected } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import type { PaymentMethod } from '../../types/MoneyBlockView';
import type { UncollectedItem } from '../../types/UncollectedItem';
import { useMoneyBlock } from '../money/useMoneyBlock';
import { useDeskWrite } from '../useDeskWrite';
import { useReceivePayment } from './useReceivePayment';

// The form holds what its check reads: the payment the money block makes, the note, the name and
// phone a remainder is left to, and whether one is; the dialog keeps them in step.
type Values = {
  visitId: number;
  amountAgorot: number | string;
  method: PaymentMethod;
  note: string;
  customerName: string;
  phone: string;
  needsDebt: boolean;
};

/**
 * «تحصيل» of an uncollected visit, ready to render: the money block over what it still owes (the
 * server's balance), a note, and — while something stays on a visit with no customer — the name and
 * the phone it is left to, which stay once shown (DI-11, DI-13). It records at most what is owed,
 * with the opening's one key (S4); done, the toast speaks from the answer (S8) and `onDone` closes it.
 */
export function useCollectDialog({
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
  const receive = useReceivePayment(spaceId);
  const { settle } = useDeskWrite();
  const { key } = useIntentKey();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const [debtShown, setDebtShown] = useState(false);
  const customer = visit.customer;
  const due = balanceAgorot ?? 0;

  const form = useServerForm<Values, ReceivePaymentRequest>({
    schema: receivePaymentSchema,
    defaultValues: {
      visitId: visit.id,
      amountAgorot: due,
      method: 'CASH',
      note: '',
      customerName: item.name,
      phone: '',
      needsDebt: false,
    },
    fields: ['amountAgorot', 'note', 'customerName', 'phone'],
    prepare: (values) => {
      const note = values.note.trim();
      return {
        visitId: values.visitId,
        amountAgorot: values.amountAgorot,
        method: values.method,
        ...(note === '' ? {} : { note }),
        ...(values.needsDebt && values.phone.trim() !== '' ? { phone: values.phone } : {}),
        ...(values.needsDebt && values.customerName.trim() !== ''
          ? { customerName: values.customerName }
          : {}),
      };
    },
    submit: async (body) => {
      // The contract's rule, said before sending: a part left unpaid on a visit with no customer
      // needs the phone it is left to.
      if (needsDebt && body.phone === undefined) {
        throw new AppError({
          type: 'validation',
          status: 422,
          errors: { phone: ['required'] },
          message: 'A phone is required for the part left unpaid.',
        });
      }
      try {
        const answer = await receive.mutateAsync({ body, key });
        toastCollected(item, answer);
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        // The visit changed meanwhile (written off, paid, priced): the list is read again.
        if (failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.collect.failed,
    fieldLines: {
      amountAgorot: { out_of_range: words.money.amountZero },
      phone: { required: words.debt.phoneRequired },
    },
    failureLines: words.refusals,
  });

  const debtName = useWatch({ control: form.form.control, name: 'customerName' });
  const money = useMoneyBlock({
    due,
    open: false,
    none: false,
    owesTo: customer?.name ?? (debtName.trim() === '' ? null : debtName),
  });
  const needsDebt = customer === null && money.left > 0;
  // Once asked in this opening, the name and the phone stay, empty or not (DI-13).
  if (needsDebt && !debtShown) setDebtShown(true);

  // The form's check follows the money block.
  const { setValue } = form.form;
  const amount = typeof money.amount === 'number' ? money.recorded : money.amount;
  const method = money.method?.value ?? 'CASH';
  useEffect(() => {
    setValue('amountAgorot', amount);
    setValue('method', method);
    setValue('needsDebt', needsDebt);
  }, [setValue, amount, method, needsDebt]);

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const price = (agorot: number) => isolate(priceText(agorot, language));
  const failure = deskFailure(refusal, form.failure, {
    title: words.collect.failed,
    lost: words.failure.lost,
    nothing: words.failure.nothing,
    retryLabel: copy.status.retry,
    retry: () => {
      send();
    },
  });

  return {
    title: words.collect.title({ name: isolate(item.name) }),
    money: {
      ...money,
      received: {
        ...money.received,
        // «المستلم الآن» says itself what it cannot read; the contract's check says a zero.
        error: money.received.error ?? form.errors.amountAgorot,
      },
    },
    groupLabel: words.money.group,
    note: { label: words.collect.note, field: form.field('note'), error: form.errors.note },
    debt:
      customer !== null
        ? money.left > 0
          ? { kind: 'customer' as const, line: words.debt.adds({ name: isolate(customer.name) }) }
          : null
        : debtShown
          ? {
              kind: 'fields' as const,
              name: { label: words.debt.name, field: form.field('customerName') },
              nameError: form.errors.customerName,
              phone: { label: words.debt.phone, field: form.field('phone') },
              phoneError: form.errors.phone,
              required: needsDebt,
            }
          : null,
    submit: {
      label:
        money.recorded === 0
          ? words.collect.submitEmpty
          : words.collect.submit({ amount: price(money.recorded) }),
      run: send,
      busy: form.isPending,
      blocked: form.blocked,
    },
    failure,
  };
}

/** «تحصيل» of an uncollected visit, ready to render. */
export type CollectDialogView = ReturnType<typeof useCollectDialog>;
