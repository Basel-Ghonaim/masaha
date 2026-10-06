import { z } from 'zod';

import { paragraphSchema, textSchema } from '../core/index.ts';
import { isInGazaStrip } from './gazaStrip.ts';

// The requests of the admin's space endpoints (docs/api/api-contract.md §5, Spaces (the admin)).

export const SPACE_NAME_MAX_LENGTH = 80;
export const SPACE_DESCRIPTION_MAX_LENGTH = 1000;
export const SPACE_ADDRESS_MAX_LENGTH = 200;
export const SPACE_LANDMARK_MAX_LENGTH = 120;

// The largest id an Int column holds.
const id = z.number().int().positive().max(2_147_483_647);

const name = textSchema(1, SPACE_NAME_MAX_LENGTH);
const address = textSchema(1, SPACE_ADDRESS_MAX_LENGTH);

/** An optional field: absent or `null` when there is none. */
function optional<T extends z.ZodType>(schema: T) {
  return schema.nullable().optional();
}

/** The map pin: a point in the Gaza Strip, refused elsewhere with `out_of_range`. */
const location = z
  .object({ lat: z.number(), lng: z.number() })
  .refine(isInGazaStrip, { params: { code: 'out_of_range' } });

/**
 * A space's profile, its basics and its location. The English name is required and the Arabic one
 * optional; the Arabic address is required and the English one optional; the descriptions and the
 * landmark are optional in both languages (docs/architecture/data-model.md › Conventions). A
 * description may break lines.
 */
const profile = {
  nameEn: name,
  nameAr: optional(name),
  descriptionAr: optional(paragraphSchema(1, SPACE_DESCRIPTION_MAX_LENGTH)),
  descriptionEn: optional(paragraphSchema(1, SPACE_DESCRIPTION_MAX_LENGTH)),
  areaId: id,
  addressAr: address,
  addressEn: optional(address),
  landmarkAr: optional(textSchema(1, SPACE_LANDMARK_MAX_LENGTH)),
  landmarkEn: optional(textSchema(1, SPACE_LANDMARK_MAX_LENGTH)),
  location,
};

/** A new, unverified space, from its profile; the admin places its pin before saving. */
export const createSpaceSchema = z.object(profile);
export type CreateSpaceRequest = z.infer<typeof createSpaceSchema>;

/** Edits the profile: what is absent is kept, and an optional field is cleared with `null`. */
export const updateSpaceProfileSchema = createSpaceSchema.partial();
export type UpdateSpaceProfileRequest = z.infer<typeof updateSpaceProfileSchema>;

/** Hides the space from the public, or shows it again. */
export const setSpaceHiddenSchema = z.object({ isHidden: z.boolean() });
export type SetSpaceHiddenRequest = z.infer<typeof setSpaceHiddenSchema>;
