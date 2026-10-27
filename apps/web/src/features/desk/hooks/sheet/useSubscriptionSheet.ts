import { gazaClockOf } from '@masaha/shared/core';
import type { Customer } from '@masaha/shared/customers';
import type { SubscriptionState } from '@masaha/shared/subscriptions';
import { useIntentKey } from '@shared/api';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { AppError, toAppError } from '@shared/errors';
import { agorotOf, dayText, dayWord, priceText, shekelsOf } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useEffect, useState, type BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { toastSubscribed } from '../../components/toast/deskToasts';
import { deskFailure } from '../../services/deskRefusal';
import { endOf } from '../../services/endOf';
import { openItems } from '../../services/openItems';
import { packageLine } from '../../services/packageLine';
import { publishedChoices, type PublishedOption } from '../../services/publishedChoices';
import type { SheetRequest, SheetValues } from '../../services/sheetRequest';
import type { PackageChoice } from '../../types/PackageChoice';
import type { SheetChoices } from '../../types/SheetChoices';
import type { SheetEntry } from '../../types/SheetEntry';
import { useCustomerFileQuery } from '../file/useCustomerFileQuery';
import { useMoneyBlock } from '../money/useMoneyBlock';
import { useStatementQuery } from '../statement/useStatementQuery';
import { useVisitTermsQuery } from '../terms/useVisitTermsQuery';
import { useDeskWrite } from '../useDeskWrite';
import { useCreateCustomer } from './useCreateCustomer';
import { useSheetForm } from './useSheetForm';
import { useSubscribe } from './useSubscribe';

/** A renewed subscription's custom terms, as the sheet holds them, so a renewal repeats them. */
function customOf(renews: SubscriptionState): Partial<SheetValues['custom']> {
  const count = (value: number | null) => (value === null ? '' : String(value));
  return {
    name: renews.name,
    audience: renews.audience,
    billing: renews.billing,
    priceAgorot: shekelsOf(renews.priceAgorot),
    shiftId: renews.shiftId === null ? '' : String(renews.shiftId),
    totalDays: count(renews.totalDays),
    daysPerWeek: count(renews.daysPerWeek),
    hoursPerDay: count(renews.hoursPerDay),
    totalHours: count(renews.totalHours),
    reason: renews.priceTyped?.reason ?? '',
  };
}

/**
 * The published price a subscription was made from: the line its name is (the name the sheet gave
 * it), else the one of its audience, shift and span (7 or 30 days, both counted) — a fixed price with
 * no limits; none when nothing matches.
 */
function publishedOf(
  renews: SubscriptionState,
  published: readonly PublishedOption[],
): PublishedOption | undefined {
  const span =
    renews.startsOn === null || renews.endsOn === null
      ? null
      : Math.round((Date.parse(renews.endsOn) - Date.parse(renews.startsOn)) / 86_400_000) + 1;
  const plain =
    renews.billing === 'FIXED' &&
    [renews.totalDays, renews.daysPerWeek, renews.hoursPerDay, renews.totalHours].every(
      (limit) => limit === null,
    );
  return (
    published.find(({ line }) => line.title === renews.name) ??
    (plain
      ? published.find(
          ({ request, days }) =>
            request.audience === renews.audience &&
            (request.shiftId ?? null) === renews.shiftId &&
            days === span,
        )
      : undefined)
  );
}

/**
 * The subscription sheet (screen 16), ready to render, for its entry: a new customer — the name and
 * the phone, the phone required while anything stays owed (K2, DI-53) — a known one's new
 * subscription, or the renewal of one of theirs. It offers the space's published week and month
 * prices first, under «منشورة للزوار» (spec D: reception sells them, nothing being typed), then the
 * offered packages, one line each (DK-007), and «مخصّص» only to whoever may type a price
 * (`visit-terms`' `mayTypePrice`, the server's answer, S5); the dates, the end the choice gives said,
 * never sent; what the customer owes from before, each item and the total, with the server's order
 * said in words (K3, decision 3: no preview); and the money block over that debt and the new price,
 * «المستلم الآن» filled with it all.
 *
 * A renewal starts where its statement says and offers what it renews as one line with «تغيير
 * الباقة» — its package, its published price, or its custom terms repeated — and nothing chosen when
 * none matches; renewed meanwhile, the sheet says so and makes a new subscription instead. A new
 * customer is two intents with two keys (S4): the customer is created, then subscribed; a subscribe
 * refused after the customer was saved says so, keeps every field and sends the subscribe alone again
 * (DI-37), and closing then says the customer stays with no subscription; a subscribe whose answer
 * was lost says only that, and is sent again with its key. A published price the server no longer
 * holds as shown is refused, said, and the prices read again (finding 171). Done, the toast speaks
 * from the answer (S8) and `onDone` closes it.
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
  // The subscribe refused after the new customer was saved (DI-37); a lost answer is not a refusal.
  const [refusedAfterCreate, setRefusedAfterCreate] = useState(false);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const [changing, setChanging] = useState(false);
  const known = entry.mode === 'new' ? null : entry.customer;
  const mayTypePrice = useVisitTermsQuery(spaceId).data?.mayTypePrice ?? false;

  // A renewal: its statement says where it starts, or that it was renewed meanwhile.
  const renews = entry.mode === 'renew' ? entry.renews : null;
  const statement = useStatementQuery(spaceId, renews?.id ?? 0, renews !== null).data;
  const renewal = renews === null ? null : statement === undefined ? undefined : statement.renewal;
  const renewing = renews !== null && renewal !== null;

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

  // The choices: the published prices, the offered packages, then «مخصّص» for whoever may type one.
  const published = publishedChoices(
    choices.prices.list,
    choices.shifts,
    { periods: words.published, students: words.published.students, validity: words.validity },
    { language, price },
  );
  const requests = new Map(published.map((option) => [option.line.value, option.request]));
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
  const options = [
    ...published.map(({ line }) => line),
    ...packages,
    ...(customChoice ? [customChoice] : []),
  ];
  // A renewal offers what it renews first: its package, or its custom terms.
  const renewedValue =
    renews === null
      ? null
      : renews.packageId !== null
        ? `pkg-${String(renews.packageId)}`
        : renews.priceTyped !== null
          ? 'custom'
          : (publishedOf(renews, published)?.line.value ?? null);
  const current =
    renewing && renewedValue !== null
      ? (options.find(({ value }) => value === renewedValue) ?? null)
      : null;
  // A renewal never guesses: what it renews, or nothing chosen until the user chooses.
  const firstChoice = renews !== null ? (current?.value ?? '') : (options[0]?.value ?? '');
  const ready = choices.state === 'ready' && choices.prices.state === 'ready';
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
        renewed: request.subscription.renewalOfId !== undefined,
        itemLabel: (item) => labels.get(JSON.stringify(item)),
        warnings: answer.meta?.warnings,
      });
      onDone();
    } catch (error) {
      const failure = toAppError(error);
      // Only a refusal says the subscription was not saved: with no answer it may have been, and
      // «إعادة المحاولة» resends it with its key (S4), never a new one.
      setRefusedAfterCreate(
        known === null && failure.type !== 'network' && failure.type !== 'timeout',
      );
      // What the customer owes, or the renewal, changed meanwhile: they are read again.
      if (failure.status === 409) settle(spaceId);
      // A published price changed or removed since it was read (finding 171): read them again.
      if (failure.errors?.published !== undefined || failure.code === 'PAYMENT_EXCEEDS_DUE') {
        choices.prices.refresh();
      }
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
    renewalOfId: renewing ? renews.id : undefined,
    published: requests,
    customDefaults: renews?.priceTyped != null ? customOf(renews) : null,
    submit: send,
  });
  const { control, setValue } = form.form;
  const [choice, startsOn, typedName, typedPrice, billing, endsOn] = useWatch({
    control,
    name: ['choice', 'startsOn', 'name', 'custom.priceAgorot', 'custom.billing', 'custom.endsOn'],
  });
  // The choices may arrive after the sheet opened, or change once read again: the first, or the
  // renewed one, is then chosen.
  const offered = options.some(({ value }) => value === choice);
  useEffect(() => {
    if (ready && !offered && firstChoice !== '') setValue('choice', firstChoice);
  }, [ready, offered, firstChoice, setValue]);
  // A renewal starts where its statement says.
  const renewalStart = renewal?.startsOn;
  useEffect(() => {
    if (renewalStart !== undefined) setValue('startsOn', renewalStart);
  }, [renewalStart, setValue]);

  const chosenPackage = choice.startsWith('pkg-')
    ? choices.packages.find(({ id }) => `pkg-${String(id)}` === choice)
    : undefined;
  const chosenPrice = published.find(({ line }) => line.value === choice);
  const isCustom = choice === 'custom' && customChoice !== null;
  const typedAgorot = agorotOf(typedPrice);
  const newPrice =
    chosenPackage !== undefined
      ? chosenPackage.billing === 'FIXED'
        ? chosenPackage.priceAgorot
        : 0
      : chosenPrice !== undefined
        ? chosenPrice.amountAgorot
        : isCustom && billing === 'FIXED' && typeof typedAgorot === 'number'
          ? typedAgorot
          : 0;
  const usage =
    chosenPackage !== undefined
      ? chosenPackage.billing !== 'FIXED'
      : isCustom && billing !== 'FIXED';
  const validity = chosenPackage?.validityDays ?? chosenPrice?.days;

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
  const halfName = created === null || !refusedAfterCreate ? null : isolate(created.name);
  const failure = deskFailure(refusal, form.failure, {
    title: words.done.failed,
    lost: copy.desk.failure.lost,
    nothing: copy.desk.failure.nothing,
    retryLabel: copy.status.retry,
    retry: () => {
      run();
    },
  });
  const packagesState =
    choices.state === 'failed' || choices.prices.state === 'failed'
      ? 'failed'
      : ready
        ? 'ready'
        : 'loading';

  return {
    title: words.title[renewing ? 'renew' : known === null ? 'new' : 'subscribe'],
    description: known === null ? words.newText : known.name,
    closeLabel: words.close,
    /** A renewal renewed meanwhile: the sheet makes a new subscription instead. */
    renewedAlready:
      renews !== null && renewal === null ? copy.errors.SUBSCRIPTION_ALREADY_RENEWED : null,
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
      state: packagesState,
      failed: words.packagesFailed,
      retry: {
        label: copy.status.retry,
        run: () => {
          choices.retry();
          choices.prices.refresh();
        },
      },
      empty: options.length === 0 ? words.noPackages : null,
      // A renewal's one line, until «تغيير الباقة» (DK-007).
      current:
        current !== null && !changing && choice === current.value
          ? {
              line: current,
              change: {
                label: words.changePackage,
                run: () => {
                  setChanging(true);
                },
              },
            }
          : null,
      groups: [
        ...(published.length > 0
          ? [{ heading: words.groups.published, options: published.map(({ line }) => line) }]
          : []),
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
        validity !== undefined
          ? {
              kind: 'package' as const,
              label: words.to,
              text: startsOn === '' ? '' : dayText(endOf(startsOn, validity), language),
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
            ? (renewing ? words.submit.renew : words.submit.save)({
                amount: price(money.recorded),
              })
            : renewing
              ? words.submit.renewNone
              : words.submit.saveNone,
      run,
      busy,
      // A renewal waits for its statement's start.
      blocked: form.blocked || !offered || (renews !== null && renewal === undefined),
    },
    failure:
      // A published price the server no longer holds as shown (finding 171).
      failure?.kind === 'refused' && refusal?.errors?.published !== undefined
        ? { ...failure, message: `${copy.desk.failure.nothing} ${words.published.gone}` }
        : failure,
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
