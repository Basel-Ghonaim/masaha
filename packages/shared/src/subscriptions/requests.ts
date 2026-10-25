import { z } from 'zod';

import { addDays, dateSchema, paginationQuerySchema, textSchema } from '../core/index.ts';
import {
  MAX_DAYS_PER_WEEK,
  MAX_HOURS_PER_DAY,
  PACKAGE_NAME_MAX_LENGTH,
  SUBSCRIPTION_BILLINGS,
} from '../packages/index.ts';
import { PRICE_MAX_AGOROT } from '../spaces/index.ts';

// The requests that correct a subscription (docs/api/api-contract.md §5, Subscriptions (managed)).

/** The longest reason a corrected price carries. */
export const PRICE_CORRECTION_REASON_MAX_LENGTH = 200;

// A count of days or hours: whole, from 1, at most the Int column's bound, as a package's.
const count = z.number().int().min(1).max(2_147_483_647);

/**
 * The staff's correction of a subscription's limits, dates and name: each optional; `null` clears a
 * limit or the end. The start stays (a subscription that has one keeps one).
 */
export const correctSubscriptionSchema = z
  .object({
    name: textSchema(1, PACKAGE_NAME_MAX_LENGTH),
    startsOn: dateSchema,
    endsOn: dateSchema.nullable(),
    totalDays: count.nullable(),
    daysPerWeek: count.max(MAX_DAYS_PER_WEEK).nullable(),
    hoursPerDay: count.max(MAX_HOURS_PER_DAY).nullable(),
    totalHours: count.nullable(),
  })
  .partial();
export type CorrectSubscriptionRequest = z.infer<typeof correctSubscriptionSchema>;

/** Checks a subscriber in on one of the space's subscriptions, which names its customer. */
export const checkInSubscriberSchema = z.object({
  subscriptionId: z.number().int().positive().max(2_147_483_647),
});
export type CheckInSubscriberRequest = z.infer<typeof checkInSubscriberSchema>;

/** The longest range of Gaza dates the dated check-ins list reads at once, both ends counted. */
export const CHECK_IN_RANGE_MAX_DAYS = 92;

/**
 * The check-ins list: `open=true`, the space's open check-ins, whole; or a range of Gaza dates,
 * `from` to `to`, both included, `to` not before `from` and at most 92 days after it, paged. Neither,
 * half a range, or both: refused.
 */
export const checkInsQuerySchema = paginationQuerySchema
  .extend({
    open: z
      .enum(['true'])
      .transform(() => true as const)
      .optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .superRefine(({ open, from, to }, ctx) => {
    const issue = (path: string, code: string) => {
      ctx.addIssue({ code: 'custom', path: [path], params: { code } });
    };
    if (open) {
      if (from !== undefined || to !== undefined) issue('open', 'invalid_choice');
      return;
    }
    if (from === undefined) issue('from', 'required');
    if (to === undefined) issue('to', 'required');
    if (from !== undefined && to !== undefined) {
      if (to < from || to > addDays(from, CHECK_IN_RANGE_MAX_DAYS - 1)) issue('to', 'out_of_range');
    }
  });
export type CheckInsQuery = z.infer<typeof checkInsQuerySchema>;

/** The owner's correction of a subscription's price and billing, together, with why. */
export const correctPriceSchema = z.object({
  billing: z.enum(SUBSCRIPTION_BILLINGS),
  priceAgorot: z.number().int().min(1).max(PRICE_MAX_AGOROT),
  reason: textSchema(1, PRICE_CORRECTION_REASON_MAX_LENGTH),
});
export type CorrectPriceRequest = z.infer<typeof correctPriceSchema>;
