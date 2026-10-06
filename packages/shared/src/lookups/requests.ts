import { z } from 'zod';

import { textSchema } from '../core/index.ts';
import { AMENITY_ICON_KEYS } from './amenityIcons.ts';

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

/** A new area in a governorate, placed last in it. Its governorate never changes afterwards. */
export const createAreaSchema = z.object({
  governorateId: id,
  nameAr: lookupName,
  nameEn: lookupName,
});
export type CreateAreaRequest = z.infer<typeof createAreaSchema>;

/** Renames an area, hides it or restores it; what is absent is kept. */
export const updateAreaSchema = z.object({
  nameAr: lookupName.optional(),
  nameEn: lookupName.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAreaRequest = z.infer<typeof updateAreaSchema>;

/**
 * A new amenity, placed last. Its key is derived from the English name when it is added, and never
 * changes afterwards.
 */
export const createAmenitySchema = z.object({
  nameAr: lookupName,
  nameEn: lookupName,
  icon: z.enum(AMENITY_ICON_KEYS),
  isFilterable: z.boolean(),
});
export type CreateAmenityRequest = z.infer<typeof createAmenitySchema>;

/** Edits an amenity, retires it (`isActive: false`) or restores it; what is absent is kept. */
export const updateAmenitySchema = z.object({
  nameAr: lookupName.optional(),
  nameEn: lookupName.optional(),
  icon: z.enum(AMENITY_ICON_KEYS).optional(),
  isFilterable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAmenityRequest = z.infer<typeof updateAmenitySchema>;

/** A list's new order: every id of the list, each once, first to last. */
export const orderSchema = z.object({ ids: z.array(id) });
export type OrderRequest = z.infer<typeof orderSchema>;
