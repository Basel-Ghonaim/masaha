import { z } from 'zod';

import { paginationQuerySchema, textSchema } from '../core/index.ts';
import { SPACE_NAME_MAX_LENGTH } from '../spaces/index.ts';

// The admin's spaces list (docs/api/api-contract.md §5, Spaces (the admin)).

// The largest id an Int column holds.
const id = z.coerce.number().int().positive().max(2_147_483_647);

/** A space's state in the admin's list: hidden first, else whether an owner has joined. */
export const SPACE_STATES = ['verified', 'unverified', 'hidden'] as const;

/**
 * `?q=&status=&governorateId=&areaId=&stale=&page=&limit=`. `q` searches the names in both
 * languages; `verified` and `unverified` leave hidden spaces out; `stale=true` keeps the spaces with
 * a stale fact group.
 */
export const adminSpacesQuerySchema = paginationQuerySchema.extend({
  q: textSchema(1, SPACE_NAME_MAX_LENGTH).optional(),
  status: z.enum(SPACE_STATES).optional(),
  governorateId: id.optional(),
  areaId: id.optional(),
  stale: z.stringbool().optional(),
});

export type AdminSpacesQuery = z.infer<typeof adminSpacesQuerySchema>;
