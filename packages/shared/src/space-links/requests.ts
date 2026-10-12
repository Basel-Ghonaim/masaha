import { z } from 'zod';

import { emailSchema, paginationQuerySchema, textSchema } from '../core/index.ts';
import { SPACE_NAME_MAX_LENGTH } from '../spaces/index.ts';
import { NAME_MAX_LENGTH } from '../users/index.ts';

// The admin's spaces list (docs/api/api-contract.md §5, Spaces (the admin)).

// The largest id an Int column holds.
const id = z.coerce.number().int().positive().max(2_147_483_647);
// An id in a JSON body, where it is a number already.
const bodyId = z.number().int().positive().max(2_147_483_647);

/**
 * The admin's list's status filter: whether an owner has joined, of the spaces shown; hidden; or
 * soft-deleted, the only status that lists them.
 */
export const SPACE_STATUSES = ['verified', 'unverified', 'hidden', 'deleted'] as const;

export type SpaceStatus = (typeof SPACE_STATUSES)[number];

/**
 * `?q=&status=&governorateId=&areaId=&stale=&page=&limit=`. `q` searches the names in both
 * languages; `verified` and `unverified` leave hidden spaces out; `deleted` lists the soft-deleted
 * spaces, which every other status leaves out; `stale=true` keeps the spaces with a stale fact group.
 */
export const adminSpacesQuerySchema = paginationQuerySchema.extend({
  q: textSchema(1, SPACE_NAME_MAX_LENGTH).optional(),
  status: z.enum(SPACE_STATUSES).optional(),
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

// The admin's owners (docs/api/api-contract.md §5, Owners (the admin)).

/**
 * A new owner, linked to one space: a new account, with a temporary password, or, with
 * `upgradeExisting`, the account the email already has, which keeps its name and password.
 */
export const addOwnerSchema = z.object({
  name: textSchema(1, NAME_MAX_LENGTH),
  email: emailSchema,
  spaceId: bodyId,
  upgradeExisting: z.boolean().optional(),
});

export type AddOwnerRequest = z.infer<typeof addOwnerSchema>;

/** A person linked to the space as its owner: a user becomes one, an owner owns one more space. */
export const linkOwnerSchema = z.object({ userId: bodyId });

export type LinkOwnerRequest = z.infer<typeof linkOwnerSchema>;

/** The global roles the admin gives; `OWNER` follows the person's owner links (ADR 0009). */
export const ADMIN_ROLE_CHOICES = ['USER', 'ADMIN'] as const;

export type AdminRoleChoice = (typeof ADMIN_ROLE_CHOICES)[number];

/** A person's global role, as the admin changes it. */
export const changeRoleSchema = z.object({ role: z.enum(ADMIN_ROLE_CHOICES) });

export type ChangeRoleRequest = z.infer<typeof changeRoleSchema>;
