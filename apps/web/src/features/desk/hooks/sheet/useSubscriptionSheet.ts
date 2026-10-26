import { gazaClockOf } from '@masaha/shared/core';
import type { Customer } from '@masaha/shared/customers';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { AppError, toAppError } from '@shared/errors';
import { agorotOf, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { toastSubscribed } from '../../components/toast/deskToasts';
import { dayText } from '../../services/dayText';
import { dayWord } from '../../services/dayWord';
import { deskFailure } from '../../services/deskRefusal';
import { endOf } from '../../services/endOf';
import { openItems } from '../../services/openItems';
import { packageLine } from '../../services/packageLine';
import type { SheetRequest } from '../../services/sheetRequest';
import type { PackageChoice } from '../../types/PackageChoice';
import type { SheetChoices } from '../../types/SheetChoices';
import type { SheetEntry } from '../../types/SheetEntry';
import { useCustomerFileQuery } from '../file/useCustomerFileQuery';
import { useMoneyBlock } from '../money/useMoneyBlock';
import { useVisitTermsQuery } from '../terms/useVisitTermsQuery';
import { useDeskWrite } from '../useDeskWrite';
import { useCreateCustomer } from './useCreateCustomer';
import { useSheetForm } from './useSheetForm';
import { useSubscribe } from './useSubscribe';

/**
 * The subscription sheet (screen 16), ready to render, for its entry: a new customer — the name and
 * the phone, the phone required while anything stays owed (K2, DI-53) — or a known one's new
 * subscription. It offers the space's offered packages, one line each (DK-007), and «مخصّص» only to
 * whoever may type a price (`visit-terms`' `mayTypePrice`, the server's answer, S5); the dates, the
 * end the package gives said, never sent; what the customer owes from before, each item and the total,
 * with the server's order said in words (K3, decision 3: no preview); and the money block over that
 * debt and the new price, «المستلم الآن» filled with it all.
 *
 * A new customer is two intents with two keys (S4): the customer is created, then subscribed; a
 * subscribe refused after the customer was saved says so, keeps every field and sends the subscribe
 * alone again (DI-37), and closing then says the customer stays with no subscription. Done, the toast
 * speaks from the answer (S8) and `onDone` closes it.
 */
export function useSubscriptionSheet({
  spaceId,
  entry,
  choices,
  onDone,
}: {
  spaceId: number;
  entry: SheetEntry;
  choices: SheetChoices;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk.sheet;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const price = (agorot: number) => isolate(priceText(agorot, language));
  const { settle } = useDeskWrite();
  const createKey = useIntentKey().key;
  const subscribeKey = useIntentKey().key;
  const create = useCreateCustomer(spaceId);
  const subscribe = useSubscribe(spaceId);
  const [created, setCreated] = useState<Customer | null>(null);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const known = entry.mode === 'new' ? null : entry.customer;
  const mayTypePrice = useVisitTermsQuery(spaceId).data?.mayTypePrice ?? false;

  // What the customer owes from before: their file's open items, as a payment would list them.
  const file = useCustomerFileQuery(spaceId, known?.id ?? null).data;
  const now = new Date();
  const prior =
    file === undefined
      ? []
      : openItems(file, {
          visitLabel: (visit) =>
            copy.desk.pay.itemVisit({
              day: dayWord(
                visit.checkedOutAt ?? visit.checkedInAt,
                now,
                language,
                copy.desk.uncollected,
              ),
            }),
        });
  const priorTotal = known === null ? 0 : (file?.debtAgorot ?? known.debtAgorot);

  // The choices: the offered packages, then «مخصّص» for whoever may type a price.
  const lineWords = {
    validity: words.validity,
    rate: words.rate,
    units: copy.desk.subscriber.progress.units,
    terms: copy.desk.file.card.terms,
  };
  const packages: PackageChoice[] = choices.packages.map((pkg) =>
    packageLine(pkg, lineWords, price),
  );
  const customChoice: PackageChoice | null = mayTypePrice
    ? { value: 'custom', title: words.custom.title, amount: null, terms: words.custom.terms }
    : null;
  const firstChoice = packages[0]?.value ?? customChoice?.value ?? '';
  const today = gazaClockOf(now).date;

  const send = async (request: SheetRequest) => {
    // The contract's rule, said before sending: a new customer leaving a debt gives a phone.
    if (needsPhone && request.customer?.phone === undefined) {
      throw new AppError({
        type: 'validation',
        status: 422,
        errors: { phone: ['required'] },
        message: 'A phone is required for the part left unpaid.',
      });
    }
    let customer = known ?? created;
    if (customer === null) {
      try {
        // A new customer: the sheet's first intent, its own key.
        customer = await create.mutateAsync({
          body: request.customer ?? { name: '' },
          key: createKey,
        });
        setCreated(customer);
      } catch (error) {
        setRefusal(toAppError(error));
        throw error;
      }
    }
    try {
      const answer = await subscribe.mutateAsync({
        customerId: customer.id,
        body: request.subscription,
        key: subscribeKey,
      });
      const labels = new Map(prior.map((item) => [JSON.stringify(item.item), item.label]));
      toastSubscribed(customer.name, answer.data, {
        renewed: false,
        itemLabel: (item) => labels.get(JSON.stringify(item)),
        warnings: answer.meta?.warnings,
      });
      onDone();
    } catch (error) {
      const failure = toAppError(error);
      // What the customer owes changed meanwhile: their file is read again.
      if (failure.status === 409) settle(spaceId);
      setRefusal(failure);
      throw error;
    }
  };

  const { form, custom } = useSheetForm({
    newCustomer: known === null,
    name: entry.mode === 'new' ? (entry.name ?? '') : '',
    phone: entry.mode === 'new' ? (entry.phone ?? '') : '',
    startsOn: today,
    choice: firstChoice,
    shifts: choices.shifts,
    submit: send,
  });
  const { control, setValue } = form.form;
  const [choice, startsOn, typedName, typedPrice, billing, endsOn] = useWatch({
    control,
    name: ['choice', 'startsOn', 'name', 'custom.priceAgorot', 'custom.billing', 'custom.endsOn'],
  });
  // The packages may arrive after the sheet opened: the first is then chosen.
  useEffect(() => {
    if (choice === '' && firstChoice !== '') setValue('choice', firstChoice);
  }, [choice, firstChoice, setValue]);

  const chosenPackage = choice.startsWith('pkg-')
    ? choices.packages.find(({ id }) => `pkg-${String(id)}` === choice)
    : undefined;
  const isCustom = choice === 'custom' && customChoice !== null;
  const typedAgorot = agorotOf(typedPrice);
  const newPrice =
    chosenPackage !== undefined
      ? chosenPackage.billing === 'FIXED'
        ? chosenPackage.priceAgorot
        : 0
      : isCustom && billing === 'FIXED' && typeof typedAgorot === 'number'
        ? typedAgorot
        : 0;
  const usage =
    chosenPackage !== undefined
      ? chosenPackage.billing !== 'FIXED'
      : isCustom && billing !== 'FIXED';

  const customerName = known?.name ?? created?.name ?? typedName.trim();
  const money = useMoneyBlock({
    due: priorTotal + newPrice,
    open: usage,
    none: true,
    owesTo: customerName === '' ? null : customerName,
  });
  const needsPhone = known === null && created === null && money.left > 0;

  // The form's payment follows the money block.
  const amount = typeof money.amount === 'number' ? money.recorded : money.amount;
  const method = money.method?.value ?? 'CASH';
  useEffect(() => {
    setValue('payment.amountAgorot', amount);
    setValue('payment.method', method);
  }, [setValue, amount, method]);

  const run = (event?: BaseSyntheticEvent) => {
    setRefusal(null);
    form.submit(event);
  };
  const busy = form.isPending;
  const halfName = created === null ? null : isolate(created.name);

  return {
    title: words.title[known === null ? 'new' : 'subscribe'],
    description: known === null ? words.newText : known.name,
    closeLabel: words.close,
    customer:
      known === null
        ? {
            name: { label: words.name, field: form.field('name'), error: form.errors.name },
            phone: {
              label: words.phone,
              optional: needsPhone ? null : words.optional,
              field: form.field('phone'),
              error:
                form.codes.phone === 'required'
                  ? words.phoneRequired({ amount: price(money.left) })
                  : form.errors.phone,
              required: needsPhone,
            },
            // Saved already: the customer's fields are no longer sent.
            saved: created !== null,
          }
        : null,
    noPhone: known !== null && known.phone === null && money.left > 0 ? words.noPhone : null,
    prior:
      known === null || priorTotal <= 0
        ? null
        : {
            title: words.prior.title({ amount: price(priorTotal) }),
            items: prior.map((item) =>
              words.prior.item({ label: isolate(item.label), amount: price(item.leftAgorot) }),
            ),
            note: words.prior.note,
          },
    packages: {
      legend: words.package,
      state: choices.state,
      failed: words.packagesFailed,
      retry: { label: copy.status.retry, run: choices.retry },
      empty: packages.length === 0 && customChoice === null ? words.noPackages : null,
      groups: [
        ...(packages.length > 0 ? [{ heading: words.groups.packages, options: packages }] : []),
        ...(customChoice !== null ? [{ heading: null, options: [customChoice] }] : []),
      ],
      chosen: choice,
      choose: (value: string) => {
        setValue('choice', value);
      },
    },
    dates: {
      from: { label: words.from, field: form.field('startsOn'), error: form.errors.startsOn },
      to:
        chosenPackage !== undefined
          ? {
              kind: 'package' as const,
              label: words.to,
              text:
                startsOn === ''
                  ? ''
                  : dayText(endOf(startsOn, chosenPackage.validityDays), language),
              help: words.toFromPackage,
            }
          : isCustom
            ? {
                kind: 'custom' as const,
                label: words.to,
                field: form.field('custom.endsOn'),
                error: form.errors['custom.endsOn'],
                help: endsOn === '' ? words.noEnd : undefined,
              }
            : null,
    },
    custom: isCustom ? custom : null,
    money,
    moneyLabel: copy.desk.money.group,
    half: halfName === null ? null : { title: words.half.title({ name: halfName }) },
    submit: {
      label:
        halfName !== null
          ? words.half.retry
          : money.recorded > 0
            ? words.submit.save({ amount: price(money.recorded) })
            : words.submit.saveNone,
      run,
      busy,
      blocked: form.blocked || choice === '',
    },
    failure: deskFailure(refusal, form.failure, {
      title: words.done.failed,
      lost: copy.desk.failure.lost,
      nothing: copy.desk.failure.nothing,
      retryLabel: copy.status.retry,
      retry: () => {
        run();
      },
    }),
    /** Closes the sheet; a customer saved with no subscription is said (DI-37). */
    close: () => {
      if (busy) return;
      if (halfName !== null) toast.info(words.half.closed({ name: halfName }));
      onDone();
    },
  };
}

/** The subscription sheet, ready to render. */
export type SubscriptionSheetView = ReturnType<typeof useSubscriptionSheet>;
