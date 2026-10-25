import {
  customersQuerySchema,
  receivePaymentSchema,
  type ReceivePaymentRequest,
} from '@masaha/shared/desk';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView, useServerForm } from '@shared/forms';
import { usePausedSearch } from '@shared/lists';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import { toastPaid } from '../../components/toast/deskToasts';
import { balanceView } from '../../services/balanceView';
import { dayWord } from '../../services/dayWord';
import { deskFailure } from '../../services/deskRefusal';
import { openItems } from '../../services/openItems';
import type { PaymentMethod } from '../../types/MoneyBlockView';
import { useCustomerFileQuery } from '../file/useCustomerFileQuery';
import { useMoneyBlock } from '../money/useMoneyBlock';
import { useReceivePayment } from '../collect/useReceivePayment';
import { useCustomersSearchQuery } from '../search/useCustomersSearchQuery';
import { useDeskWrite } from '../useDeskWrite';

/** The debtors the picker lists at once. */
const PICK_LIMIT = 20;

/** Where a payment starts: a customer, an item of theirs, or neither (the picker). */
export type PayTarget = { customerId?: number; itemKey?: string };

type Values = {
  visitId?: number;
  subscriptionId?: number;
  amountAgorot: number | string;
  method: PaymentMethod;
  note: string;
};

/** The picker's search a text makes: the customers list's `q`, as its schema reads it, or none. */
const searchOf = (text: string) => {
  if (text.trim() === '') return undefined;
  const parsed = customersQuerySchema.safeParse({ q: text });
  return parsed.success ? parsed.data.q : undefined;
};

/**
 * «استلام دفعة», ready to render (DK-012). With no customer, the picker: the customers who owe, those
 * present now first (DI-21), searched by name or a phone's last digits. With one, their file's open
 * items — the unpaid visits, oldest first, then the subscriptions that owe — the one the entry named
 * chosen, else the first; one payment pays one item (DI-22). The money block fills «المستلم الآن»
 * with what the item still owes and follows the item only while untouched (DI-35); a usage-based
 * item takes more, as credit. The opening holds one key (S4); done, the toast speaks from the
 * answer (S8) and `onDone` closes it.
 */
export function usePayDialog({
  spaceId,
  target,
  presentIds,
  onDone,
}: {
  spaceId: number;
  target: PayTarget;
  /** The customers present now, by id: the picker lists them first. */
  presentIds: ReadonlySet<number>;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk.pay;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const price = (agorot: number) => isolate(priceText(agorot, language));
  const receive = useReceivePayment(spaceId);
  const { settle } = useDeskWrite();
  const { key } = useIntentKey();
  const [customerId, setCustomerId] = useState<number | null>(target.customerId ?? null);
  const [chosenKey, setChosenKey] = useState<string | undefined>(target.itemKey);
  const [refusal, setRefusal] = useState<AppError | null>(null);

  // The picker: the debtors, by the paused search.
  const [q, setQ] = useState<string | undefined>(undefined);
  const pickSearch = usePausedSearch({ q, searchOf, write: setQ });
  const debtors = useCustomersSearchQuery(
    spaceId,
    customerId === null ? { q, payment: 'OWES', limit: PICK_LIMIT } : null,
  );
  const pickRows = [...(debtors.data?.data ?? [])]
    .sort((a, b) => Number(presentIds.has(b.id)) - Number(presentIds.has(a.id)))
    .map((row) => ({
      key: String(row.id),
      name: row.name,
      phone: row.phone,
      balance: balanceView(row, copy.desk.customer, price),
      choose: () => {
        setCustomerId(row.id);
        setChosenKey(undefined);
      },
    }));
  const debtorsView = useRefusalView(
    debtors.data === undefined ? debtors.error : null,
    copy.desk.search.failed,
  );

  // The items: the chosen customer's file.
  const file = useCustomerFileQuery(spaceId, customerId);
  const fileView = useRefusalView(file.data === undefined ? file.error : null, words.fileFailed);
  const now = new Date();
  const items =
    file.data === undefined
      ? []
      : openItems(file.data, {
          visitLabel: (visit) =>
            words.itemVisit({
              day: dayWord(
                visit.checkedOutAt ?? visit.checkedInAt,
                now,
                language,
                copy.desk.uncollected,
              ),
            }),
          chosen: target.itemKey,
        });
  const chosen = items.find((item) => item.key === chosenKey) ?? items[0];
  const name = file.data?.customer.name ?? '';

  const money = useMoneyBlock({
    due: chosen?.leftAgorot ?? 0,
    open: chosen?.usage ?? false,
    none: false,
    owesTo: name === '' ? null : name,
  });

  const form = useServerForm<Values, ReceivePaymentRequest>({
    schema: receivePaymentSchema,
    defaultValues: { amountAgorot: 0, method: 'CASH', note: '' },
    fields: ['amountAgorot', 'note'],
    prepare: (values) => {
      const note = values.note.trim();
      return {
        ...(values.visitId === undefined ? {} : { visitId: values.visitId }),
        ...(values.subscriptionId === undefined ? {} : { subscriptionId: values.subscriptionId }),
        amountAgorot: values.amountAgorot,
        method: values.method,
        ...(note === '' ? {} : { note }),
      };
    },
    submit: async (body) => {
      try {
        const answer = await receive.mutateAsync({ body, key });
        toastPaid(name, chosen?.label ?? '', answer);
        onDone();
      } catch (error) {
        const failure = toAppError(error);
        // The item changed meanwhile (paid, written off): the file is read again.
        if (failure.status === 409) settle(spaceId);
        setRefusal(failure);
        throw error;
      }
    },
    failureTitle: words.failed,
    fieldLines: { amountAgorot: { out_of_range: copy.desk.money.amountZero } },
    failureLines: copy.desk.refusals,
  });

  // The form's check follows the item chosen and the money block.
  const visitId =
    chosen !== undefined && 'visitId' in chosen.item ? chosen.item.visitId : undefined;
  const subscriptionId =
    chosen !== undefined && 'subscriptionId' in chosen.item
      ? chosen.item.subscriptionId
      : undefined;
  const amount = typeof money.amount === 'number' ? money.recorded : money.amount;
  const method = money.method?.value ?? 'CASH';
  const { setValue } = form.form;
  useEffect(() => {
    setValue('amountAgorot', amount);
    setValue('method', method);
    setValue('visitId', visitId);
    setValue('subscriptionId', subscriptionId);
  }, [setValue, amount, method, visitId, subscriptionId]);

  const send = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };

  const step =
    customerId === null
      ? ('pick' as const)
      : file.data === undefined
        ? file.isPending
          ? ('loading' as const)
          : ('failed' as const)
        : items.length === 0
          ? ('nothing' as const)
          : ('items' as const);

  return {
    step,
    title:
      customerId === null || name === '' ? words.title : words.titleFor({ name: isolate(name) }),
    pick: {
      input: {
        label: words.choose,
        placeholder: copy.desk.search.placeholder,
        text: pickSearch.text,
        change: pickSearch.change,
      },
      heading: words.owing,
      pickLabel: words.pick,
      state: debtors.isPending
        ? ('loading' as const)
        : debtors.data === undefined
          ? ('failed' as const)
          : ('ready' as const),
      rows: pickRows,
      none: debtors.data !== undefined && pickRows.length === 0 ? words.noCustomer : null,
      failure: {
        title: copy.desk.search.failed,
        message: debtorsView.view?.message,
        retryLabel: copy.status.retry,
        retry: () => {
          void debtors.refetch();
        },
      },
    },
    another:
      target.customerId === undefined && customerId !== null
        ? {
            label: words.another,
            run: () => {
              setCustomerId(null);
              setChosenKey(undefined);
              setRefusal(null);
            },
          }
        : null,
    fileFailure: {
      title: words.fileFailed,
      message: fileView.view?.message,
      retryLabel: copy.status.retry,
      retry: () => {
        void file.refetch();
      },
    },
    nothing: words.owesNothing,
    items: {
      legend: words.item,
      chosen: chosen?.key ?? '',
      options: items.map((item) => ({
        key: item.key,
        label: item.label,
        line: words.itemLine({
          due: price(item.dueAgorot),
          paid: price(item.paidAgorot),
          left: price(item.leftAgorot),
        }),
      })),
      choose: setChosenKey,
    },
    usageNote: chosen?.usage === true ? words.usageNote : null,
    money: {
      ...money,
      received: { ...money.received, error: money.received.error ?? form.errors.amountAgorot },
    },
    groupLabel: copy.desk.money.group,
    note: { label: copy.desk.collect.note, field: form.field('note'), error: form.errors.note },
    submit: {
      label: words.submit({ amount: price(money.recorded) }),
      run: send,
      busy: form.isPending,
      blocked: form.blocked || money.recorded === 0,
    },
    failure: deskFailure(refusal, form.failure, {
      title: words.failed,
      lost: copy.desk.failure.lost,
      nothing: copy.desk.failure.nothing,
      retryLabel: copy.status.retry,
      retry: () => {
        send();
      },
    }),
  };
}

/** «استلام دفعة», ready to render. */
export type PayDialogView = ReturnType<typeof usePayDialog>;
