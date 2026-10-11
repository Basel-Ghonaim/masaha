import { z } from 'zod';

import { paginationQuerySchema, textSchema } from '../core/index.ts';
import { SPACE_NAME_MAX_LENGTH } from '../spaces/index.ts';
import { NAME_MAX_LENGTH } from '../users/index.ts';

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

// The admin's users list (docs/api/api-contract.md §5, Users (the admin)).

/** A global role, as the users list filters by it: lowercase, like the spaces list's states. */
export const USER_ROLE_FILTERS = ['user', 'owner', 'admin'] as const;

/** Whether an account may sign in. */
export const ACCOUNT_STATES = ['active', 'suspended'] as const;

/**
 * `?q=&role=&state=&page=&limit=`. `q` searches the name and the email; `role=owner` is the owners
 * page.
 */
export const adminUsersQuerySchema = paginationQuerySchema.extend({
  q: textSchema(1, NAME_MAX_LENGTH).optional(),
  role: z.enum(USER_ROLE_FILTERS).optional(),
  state: z.enum(ACCOUNT_STATES).optional(),
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
