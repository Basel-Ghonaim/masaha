import { z } from 'zod';

import { LIVE_STATUSES } from './responses.ts';

// The requests of the managed occupancy endpoints (docs/api/api-contract.md §5, Capacity (managed)
// and Occupancy (managed)).

/**
 * The most people a space may seat. Gaza's coworking spaces seat tens; the ceiling catches a slip of
 * the keyboard (400 for 40) that would leave a space never full.
 */
export const CAPACITY_MAX = 1_000;

/** Sets the space's capacity whole: a whole number from 1, or `null` to clear it. */
export const setCapacitySchema = z.object({
  capacity: z.number().int().min(1).max(CAPACITY_MAX).nullable(),
});
export type SetCapacityRequest = z.infer<typeof setCapacitySchema>;

/** How long a manual override lasts; never past today's closing. */
export const OVERRIDE_DURATIONS = ['MINUTES_30', 'HOUR_1', 'HOURS_2', 'UNTIL_CLOSING'] as const;
export type OverrideDuration = (typeof OVERRIDE_DURATIONS)[number];

/** Sets the manual override: a state, for one of the durations. */
export const setStatusOverrideSchema = z.object({
  state: z.enum(LIVE_STATUSES),
  duration: z.enum(OVERRIDE_DURATIONS),
});
export type SetStatusOverrideRequest = z.infer<typeof setStatusOverrideSchema>;
