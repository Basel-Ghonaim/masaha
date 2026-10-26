import { createCustomerSchema, type CreateCustomerRequest } from '@masaha/shared/customers';
import { subscribeSchema, type SubscribeRequest } from '@masaha/shared/desk';
import type { SUBSCRIPTION_BILLINGS } from '@masaha/shared/packages';
import type { PRICE_AUDIENCES } from '@masaha/shared/spaces';
import type { FormSchema } from '@shared/forms';
import { agorotOf, wholeNumberOf } from '@shared/lib';
import type { PaymentMethod } from '../types/MoneyBlockView';

/** A custom subscription's limits, in the order the sheet offers them. */
export const LIMIT_NAMES = ['totalDays', 'daysPerWeek', 'hoursPerDay', 'totalHours'] as const;

/**
 * What the subscription sheet holds, by the paths its requests name: a new customer's name and
 * phone; the chosen package (`pkg-{id}`), published price (`price-…`) or `custom`; the start; the custom terms
 * as typed; and the payment the money block makes, the amount recorded (or the text it cannot read).
 */
export type SheetValues = {
  name: string;
  phone: string;
  choice: string;
  startsOn: string;
  custom: {
    name: string;
    audience: (typeof PRICE_AUDIENCES)[number];
    billing: (typeof SUBSCRIPTION_BILLINGS)[number];
    priceAgorot: string;
    /** `''` for no shift. */
    shiftId: string;
    endsOn: string;
    reason: string;
  } & Record<(typeof LIMIT_NAMES)[number], string>;
  payment: { amountAgorot: number | string; method: PaymentMethod };
};

/** A published price as the subscribe names it: its key, and the name the desk gives it. */
export type PublishedChoice = NonNullable<SubscribeRequest['published']>;

/** The sheet's two requests: the new customer's, when there is one, and the subscribe. */
export type SheetRequest = { customer?: CreateCustomerRequest; subscription: SubscribeRequest };

/** A field left blank is no value: it is not sent. */
const given = <T>(key: string, value: T | undefined) =>
  value === undefined ? {} : { [key]: value };

/**
 * The input the sheet's schema reads, from what it holds (S7): the new customer's name and phone
 * (the phone only when typed); exactly one choice — a package's id, a published price by its key
 * and its name (`published`, never a price's id: the server reads its amount), or the custom terms, each limit,
 * the shift and the end only when given, the price read as agorot; the start; the subscription it
 * renews; and the payment only when something is recorded. What the browser cannot read is passed
 * as typed, for the contract's schema to refuse on its field.
 */
export function sheetInput(
  values: SheetValues,
  {
    newCustomer,
    renewalOfId,
    published,
  }: {
    newCustomer: boolean;
    renewalOfId?: number;
    /** The published prices offered, by their choice's value. */
    published?: ReadonlyMap<string, PublishedChoice>;
  },
): Record<string, unknown> {
  const { custom, payment } = values;
  const price = published?.get(values.choice);
  const choice = values.choice.startsWith('pkg-')
    ? { packageId: Number(values.choice.slice('pkg-'.length)) }
    : price !== undefined
      ? { published: price }
      : values.choice === 'custom'
        ? {
            custom: {
              name: custom.name,
              billing: custom.billing,
              ...given('priceAgorot', agorotOf(custom.priceAgorot)),
              audience: custom.audience,
              ...given('shiftId', custom.shiftId === '' ? undefined : Number(custom.shiftId)),
              ...given('endsOn', custom.endsOn.trim() === '' ? undefined : custom.endsOn),
              ...Object.fromEntries(
                LIMIT_NAMES.flatMap((limit) => {
                  const count = wholeNumberOf(custom[limit]);
                  return count === undefined ? [] : [[limit, count]];
                }),
              ),
              reason: custom.reason,
            },
          }
        : {};
  return {
    ...(newCustomer && {
      name: values.name,
      ...given('phone', values.phone.trim() === '' ? undefined : values.phone),
    }),
    ...choice,
    ...given('startsOn', values.startsOn === '' ? undefined : values.startsOn),
    ...given('renewalOfId', renewalOfId),
    ...((typeof payment.amountAgorot === 'string' || payment.amountAgorot > 0) && {
      payment: { amountAgorot: payment.amountAgorot, method: payment.method },
    }),
  };
}

/**
 * The sheet's check, with the contract's rules (ADR 0004): a new customer's name and phone by
 * `createCustomerSchema`, the rest by `subscribeSchema`, every field's error at its own path; it
 * answers the two requests apart.
 */
export function sheetSchema(newCustomer: boolean): FormSchema<SheetRequest> {
  return {
    safeParse: (input) => {
      const { name, phone, ...rest } = input as Record<string, unknown>;
      const subscription = subscribeSchema.safeParse(rest);
      const customer = newCustomer ? createCustomerSchema.safeParse({ name, phone }) : null;
      if (!subscription.success || customer?.success === false) {
        return {
          success: false,
          error: {
            issues: [...(customer?.error?.issues ?? []), ...(subscription.error?.issues ?? [])],
          },
        };
      }
      return {
        success: true,
        data: {
          ...(customer?.data !== undefined && { customer: customer.data }),
          subscription: subscription.data,
        },
      };
    },
  };
}
