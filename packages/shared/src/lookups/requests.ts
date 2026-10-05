import { z } from 'zod';

import { textSchema } from '../core/index.ts';

// The requests of the admin's lookup endpoints (docs/api/api-contract.md §5, Lookups).

/** A lookup's name, in either language, at most this many characters. */
export const LOOKUP_NAME_MAX_LENGTH = 60;

/** Both names are required (docs/architecture/data-model.md › Conventions). */
const lookupName = textSchema(1, LOOKUP_NAME_MAX_LENGTH);

// The largest id an Int column holds.
const id = z.number().int().positive().max(2_147_483_647);

/** A new governorate, placed last. */
export const createGovernorateSchema = z.object({ nameAr: lookupName, nameEn: lookupName });
export type CreateGovernorateRequest = z.infer<typeof createGovernorateSchema>;

/** Renames a governorate, hides it (`isActive: false`) or restores it; what is absent is kept. */
export const updateGovernorateSchema = z.object({
  nameAr: lookupName.optional(),
  nameEn: lookupName.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateGovernorateRequest = z.infer<typeof updateGovernorateSchema>;

/** A list's new order: every id of the list, each once, first to last. */
export const orderSchema = z.object({ ids: z.array(id) });
export type OrderRequest = z.infer<typeof orderSchema>;
