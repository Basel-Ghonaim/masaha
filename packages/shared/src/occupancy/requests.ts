import { z } from 'zod';

// The request of the managed capacity endpoint (docs/api/api-contract.md §5, Capacity (managed)).

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
