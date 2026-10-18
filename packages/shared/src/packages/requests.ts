import { z } from 'zod';

import { textSchema } from '../core/index.ts';
import { PRICE_AUDIENCES, PRICE_MAX_AGOROT } from '../spaces/index.ts';

// The requests of the managed packages endpoints (docs/api/api-contract.md §5, Packages (managed)).

/** How a package is billed: the whole price, or the rate per hour or per day. */
export const SUBSCRIPTION_BILLINGS = ['FIXED', 'PER_HOUR', 'PER_DAY'] as const;

export const PACKAGE_NAME_MAX_LENGTH = 60;
export const MAX_DAYS_PER_WEEK = 7;
export const MAX_HOURS_PER_DAY = 24;

// The largest value an Int column holds (PostgreSQL's integer), as the shared ids use.
const MAX_INT = 2_147_483_647;

const id = z.number().int().positive().max(MAX_INT);

/** A count of days or hours: whole, from 1, at most the Int column's bound (the owner's S2). */
const count = z.number().int().min(1).max(MAX_INT);

/** An optional field: absent or `null` when there is none. */
function optional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional();
}

/**
 * A package's terms: a name of the owner's, a validity, the limits it sets (each absent or `null`
 * when it sets none, and they combine freely), how it is billed and at what price, its audience and
 * an optional shift of the space. The price is the whole amount when `FIXED`, else the rate per hour
 * or per day, above zero as a space's prices are: no package is free.
 */
const terms = {
  name: textSchema(1, PACKAGE_NAME_MAX_LENGTH),
  validityDays: count,
  totalDays: optional(count),
  daysPerWeek: optional(count.max(MAX_DAYS_PER_WEEK)),
  hoursPerDay: optional(count.max(MAX_HOURS_PER_DAY)),
  totalHours: optional(count),
  billing: z.enum(SUBSCRIPTION_BILLINGS),
  priceAgorot: z.number().int().min(1).max(PRICE_MAX_AGOROT),
  audience: z.enum(PRICE_AUDIENCES),
  shiftId: optional(id),
};

export const createPackageSchema = z.object(terms);
export type CreatePackageRequest = z.infer<typeof createPackageSchema>;
