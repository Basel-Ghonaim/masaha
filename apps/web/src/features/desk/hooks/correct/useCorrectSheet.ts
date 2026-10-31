import { SUBSCRIPTION_BILLINGS } from '@masaha/shared/packages';
import {
  correctPriceSchema,
  correctSubscriptionSchema,
  type CorrectPriceRequest,
  type CorrectSubscriptionRequest,
  type SubscriptionState,
} from '@masaha/shared/subscriptions';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { useServerForm } from '@shared/forms';
import { agorotOf, dayText, shekelsOf, wholeNumberOf } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useRef, useState, type BaseSyntheticEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { LIMIT_NAMES } from '../../services/sheetRequest';
import { useCorrectPrice, useCorrectTerms } from './useCorrectSubscription';

type Billing = (typeof SUBSCRIPTION_BILLINGS)[number];
type Limit = (typeof LIMIT_NAMES)[number];

type Values = {
  name: string;
  startsOn: string;
  endsOn: string;
  billing: Billing;
  priceAgorot: string;
  reason: string;
} & Record<Limit, string>;

/** The correction as one request: the terms that changed, and the price part when it changed. */
const correctionSchema = correctSubscriptionSchema.extend(correctPriceSchema.partial().shape);
type Correction = CorrectSubscriptionRequest & Partial<CorrectPriceRequest>;

const textOf = (count: number | null) => (count === null ? '' : String(count));

/**
 * «تصحيح {name}», ready to render (D8.4, finding 163): «الاسم والتواريخ والحدود» — the name, «من» and
 * «إلى» (clearable, «بلا تاريخ نهاية»), the four limits (each cleared to «بلا حد») —, and, for the
 * owner (`owner`) alone, «السعر» — the billing, the price and why it is corrected, required. Only the
 * changed fields are sent: the terms first (`PATCH …`), then the price part, both its terms together
 * with the reason (`PUT …/price`), each its own outcome — terms saved before a refused price are
 * not sent again. Each sent once with no key (S3). Done, the toast says so and the file is read
 * again; nothing changed says so. Refused, it says why inside the sheet: an end before the start on
 * «إلى», `SUBSCRIPTION_ENDED`, `PRICE_BELOW_PAID`, too many attempts.
 */
export function useCorrectSheet({
  spaceId,
  subscription,
  owner,
  onDone,
}: {
  spaceId: number;
  subscription: SubscriptionState;
  owner: boolean;
  onDone: () => void;
}) {
  const copy = useCopy();
  const words = copy.desk.correct;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const terms = useCorrectTerms(spaceId, subscription.id);
  const price = useCorrectPrice(spaceId, subscription.id);
  // What the server holds, as the last answer said: a part saved is compared against it again.
  const base = useRef(subscription);
  const [unchanged, setUnchanged] = useState(false);

  const form = useServerForm<Values, Correction>({
    schema: correctionSchema,
    defaultValues: {
      name: subscription.name,
      startsOn: subscription.startsOn ?? '',
      endsOn: subscription.endsOn ?? '',
      billing: subscription.billing,
      priceAgorot: shekelsOf(subscription.priceAgorot),
      reason: '',
      ...(Object.fromEntries(
        LIMIT_NAMES.map((limit) => [limit, textOf(subscription[limit])]),
      ) as Record<Limit, string>),
    },
    fields: ['name', 'startsOn', 'endsOn', ...LIMIT_NAMES, 'billing', 'priceAgorot', 'reason'],
    // Only what differs from the subscription as the server holds it; a blank end or limit clears it.
    prepare: (values) => {
      const held = base.current;
      const end = values.endsOn === '' ? null : values.endsOn;
      const changed: Record<string, unknown> = {
        ...(values.name.trim() !== held.name && { name: values.name }),
        ...(values.startsOn !== '' &&
          values.startsOn !== held.startsOn && { startsOn: values.startsOn }),
        ...(end !== held.endsOn && { endsOn: end }),
      };
      for (const limit of LIMIT_NAMES) {
        const typed = wholeNumberOf(values[limit]) ?? null;
        if (typed !== held[limit]) changed[limit] = typed;
      }
      const typedPrice = agorotOf(values.priceAgorot);
      if (owner && (values.billing !== held.billing || typedPrice !== held.priceAgorot)) {
        // Both terms go together, with why.
        changed.billing = values.billing;
        changed.priceAgorot = typedPrice ?? '';
        changed.reason = values.reason;
      }
      return changed;
    },
    submit: async ({ billing, priceAgorot, reason, ...changedTerms }) => {
      const pricePart =
        billing !== undefined && priceAgorot !== undefined && reason !== undefined
          ? { billing, priceAgorot, reason }
          : null;
      if (Object.keys(changedTerms).length === 0 && pricePart === null) {
        setUnchanged(true);
        return;
      }
      if (Object.keys(changedTerms).length > 0) {
        base.current = await terms.mutateAsync(changedTerms);
      }
      if (pricePart !== null) base.current = await price.mutateAsync(pricePart);
      toast.success(words.done);
      onDone();
    },
    failureTitle: words.failed,
    fieldLines: { endsOn: { out_of_range: words.endBeforeStart } },
    failureLines: { ...copy.desk.refusals, ...words.refusals },
  });
  const { control, setValue } = form.form;
  const [startsOn, endsOn, billing] = useWatch({
    control,
    name: ['startsOn', 'endsOn', 'billing'],
  });
  const busy = form.isPending;

  const send = (event?: BaseSyntheticEvent) => {
    setUnchanged(false);
    form.submit(event);
  };

  return {
    title: words.title({ name: isolate(subscription.name) }),
    closeLabel: copy.desk.sheet.close,
    terms: {
      title: words.terms,
      name: { label: words.name, field: form.field('name'), error: form.errors.name },
      from: {
        label: words.from,
        value: startsOn,
        text: startsOn === '' ? '' : dayText(startsOn, language),
        choose: (date: string) => {
          setValue('startsOn', date, { shouldDirty: true });
        },
        error: form.errors.startsOn,
      },
      to: {
        label: words.to,
        value: endsOn,
        text: endsOn === '' ? copy.desk.customer.noEnd : dayText(endsOn, language),
        choose: (date: string) => {
          setValue('endsOn', date, { shouldDirty: true });
        },
        clear: {
          label: copy.desk.customer.noEnd,
          run: () => {
            setValue('endsOn', '', { shouldDirty: true });
          },
        },
        error: form.errors.endsOn,
      },
      limits: LIMIT_NAMES.map((limit) => ({
        key: limit,
        label: copy.desk.sheet.custom.limitNames[limit],
        placeholder: words.noLimit,
        field: form.field(limit),
        error: form.errors[limit],
      })),
    },
    price: owner
      ? {
          title: words.price.title,
          billing: {
            label: words.price.billing,
            value: billing,
            options: SUBSCRIPTION_BILLINGS.map((value) => ({
              value,
              label: copy.desk.sheet.custom.billings[value],
            })),
            choose: (value: string) => {
              const chosen = SUBSCRIPTION_BILLINGS.find((each) => each === value);
              // A chip pressed again leaves the group empty: the billing stays as it was.
              if (chosen !== undefined) setValue('billing', chosen, { shouldDirty: true });
            },
          },
          price: {
            label: words.price.price,
            field: form.field('priceAgorot'),
            error: form.errors.priceAgorot,
          },
          reason: {
            label: words.price.reason,
            field: form.field('reason'),
            error: form.errors.reason,
          },
        }
      : null,
    unchanged: unchanged ? copy.desk.edit.nothingChanged : null,
    submit: { label: words.save, run: send, busy, blocked: form.blocked },
    back: { label: words.back },
    failure: form.failure,
  };
}

/** «تصحيح {name}», ready to render. */
export type CorrectSheetView = ReturnType<typeof useCorrectSheet>;
