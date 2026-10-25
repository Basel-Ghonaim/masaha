import { leaveToCustomerSchema, type LeaveToCustomerRequest } from '@masaha/shared/desk';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useState, type BaseSyntheticEvent } from 'react';
import { toastDebtRecorded } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import type { UncollectedItem } from '../../types/UncollectedItem';
import { useDeskWrite } from '../useDeskWrite';
import { useLeaveToCustomer } from './useLeaveToCustomer';

type Values = { customerName: string; phone: string };

/**
 * «تسجيل دين» of an uncollected visit, ready to render: the name first (DI-17), then the phone the
 * visit's unpaid rest is left to, with what follows. Sent once, with no key (S3): a lost answer says
 * so and the user decides; done, the toast names who now owes it and `onDone` closes it.
 */
export function useDebtDialog({
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
  const leave = useLeaveToCustomer(spaceId, visit.id);
  const { settle } = useDeskWrite();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const amount =
    balanceAgorot === null
      ? words.uncollected.unpriced
      : isolate(priceText(balanceAgorot, language));

  const form = useServerForm<Values, LeaveToCustomerRequest>({
    schema: leaveToCustomerSchema,
    defaultValues: { customerName: item.name, phone: '' },
    fields: ['customerName', 'phone'],
    prepare: (values) => ({
      phone: values.phone.trim() === '' ? undefined : values.phone,
      ...(values.customerName.trim() === '' ? {} : { customerName: values.customerName }),
    }),
    submit: async (body) => {
      try {
        const answer = await leave.mutateAsync(body);
        toastDebtRecorded(item, answer);
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        if (failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.debt.failed,
    fieldLines: { phone: { required: words.debt.phoneRequired } },
    failureLines: words.refusals,
  });

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const failure = deskFailure(refusal, form.failure, {
    title: words.debt.failed,
    lost: words.failure.lost,
    nothing: words.failure.nothing,
    retryLabel: copy.status.retry,
    retry: () => {
      send();
    },
  });

  return {
    title: words.debt.title({ name: isolate(item.name) }),
    text: words.debt.text({ amount }),
    name: {
      label: words.debt.name,
      field: form.field('customerName'),
      error: form.errors.customerName,
    },
    phone: { label: words.debt.phone, field: form.field('phone'), error: form.errors.phone },
    submit: { label: words.debt.submit, run: send, busy: form.isPending, blocked: form.blocked },
    failure,
  };
}

/** «تسجيل دين» of an uncollected visit, ready to render. */
export type DebtDialogView = ReturnType<typeof useDebtDialog>;
