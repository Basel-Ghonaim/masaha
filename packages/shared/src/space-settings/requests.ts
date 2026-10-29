import { z } from 'zod';

import { reminderTemplateSchema } from './reminderTemplate.ts';

// The request of the managed settings endpoint (docs/api/api-contract.md §5, Settings (managed)).

/** How a visit's stay is rounded: up after N minutes into a started hour, to the half hour, or none. */
export const VISIT_ROUNDINGS = ['UP_AFTER_MINUTES', 'NEAREST_HALF_HOUR', 'PER_MINUTE'] as const;

/**
 * The stay limit, in minutes: whole hours from 1 to 23. A visit is a same-day stay, so closing time
 * already ends every stay; a limit of a day or more would never act.
 */
export const MAX_STAY_MINUTES = { min: 60, max: 1_380, step: 60 } as const;

/** The N of "up after N minutes": 0 would round every started minute up, 60 never. */
export const ROUNDING_MINUTES = { min: 1, max: 59 } as const;

interface RoundingValues {
  visitRounding?: (typeof VISIT_ROUNDINGS)[number] | undefined;
  visitRoundingMinutes?: number | null | undefined;
}

/**
 * The rounding rule and its minutes are one choice, sent together or not at all, so a patch is
 * checked alone, never against the stored row: the minutes are set exactly for "up after N minutes".
 */
function roundingPair(
  { visitRounding, visitRoundingMinutes }: RoundingValues,
  ctx: z.RefinementCtx,
) {
  if (visitRounding === undefined && visitRoundingMinutes === undefined) return;
  if (visitRounding === undefined) {
    ctx.addIssue({ code: 'custom', path: ['visitRounding'], params: { code: 'required' } });
    return;
  }
  const upAfter = visitRounding === 'UP_AFTER_MINUTES';
  if (visitRoundingMinutes === undefined || (upAfter && visitRoundingMinutes === null)) {
    ctx.addIssue({ code: 'custom', path: ['visitRoundingMinutes'], params: { code: 'required' } });
  } else if (!upAfter && visitRoundingMinutes !== null) {
    ctx.addIssue({
      code: 'custom',
      path: ['visitRoundingMinutes'],
      params: { code: 'invalid_format' },
    });
  }
}

/**
 * What a new space's settings are copied from, as the admin saves them (docs/api/api-contract.md ›
 * Platform settings): a subset of a space's settings, each required, the minutes set exactly for
 * "up after N minutes", with the codes of a space's own edit.
 */
export const newSpaceDefaultsSchema = z
  .object({
    autoCheckoutAtClosing: z.boolean(),
    visitRounding: z.enum(VISIT_ROUNDINGS),
    visitRoundingMinutes: z
      .number()
      .int()
      .min(ROUNDING_MINUTES.min)
      .max(ROUNDING_MINUTES.max)
      .nullable(),
    visitCapAtDayPrice: z.boolean(),
  })
  .superRefine(roundingPair);
export type NewSpaceDefaults = z.infer<typeof newSpaceDefaultsSchema>;

/**
 * Edits a space's settings: any of them, what is absent kept. `null` clears the stay limit (closing
 * time only) or the reminder (the copy catalogue's text); a switch is never `null`.
 */
export const updateSpaceSettingsSchema = z
  .object({
    autoCheckoutAtClosing: z.boolean(),
    maxStayMinutes: z
      .number()
      .int()
      .min(MAX_STAY_MINUTES.min)
      .max(MAX_STAY_MINUTES.max)
      .multipleOf(MAX_STAY_MINUTES.step)
      .nullable(),
    visitRounding: z.enum(VISIT_ROUNDINGS),
    visitRoundingMinutes: z
      .number()
      .int()
      .min(ROUNDING_MINUTES.min)
      .max(ROUNDING_MINUTES.max)
      .nullable(),
    visitCapAtDayPrice: z.boolean(),
    visitStudentPrices: z.boolean(),
    receptionMayTypePrices: z.boolean(),
    reminderTemplate: reminderTemplateSchema.nullable(),
  })
  .partial()
  .superRefine(roundingPair);
export type UpdateSpaceSettingsRequest = z.infer<typeof updateSpaceSettingsSchema>;
