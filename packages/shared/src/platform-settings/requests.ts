import { z } from 'zod';

import { emailSchema, phoneSchema } from '../core/index.ts';

// The admin's saves of the platform's settings (docs/api/api-contract.md › Platform settings): each
// card its own resource, saved whole. The new-space defaults are a space's settings, so their
// schema is space-settings' (`newSpaceDefaultsSchema`).

/** The longest staleness threshold, in days: a typo of thousands would mark nothing stale for years. */
export const STALENESS_DAYS_MAX = 365;

const days = z.int().min(1).max(STALENESS_DAYS_MAX);

/** After how many days a space's fact group is stale: the prices, and every other group. */
export const stalenessSchema = z.object({
  stalenessDays: days,
  priceStalenessDays: days,
});
export type StalenessRequest = z.infer<typeof stalenessSchema>;

/**
 * The platform's contact: an email, stored lowercased, and a WhatsApp number in its E.164 form
 * (Palestinian or Israeli). Both are sent; `null` clears one.
 */
export const platformContactSchema = z.object({
  email: emailSchema.nullable(),
  whatsapp: phoneSchema.nullable(),
});
export type PlatformContactRequest = z.infer<typeof platformContactSchema>;
