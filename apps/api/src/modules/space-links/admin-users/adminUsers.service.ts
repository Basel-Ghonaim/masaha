import type { AdminUserRow, AdminUsersQuery } from '@masaha/shared/space-links';

import type { Role } from '../../../generated/prisma/enums.ts';
import type { SpacesService } from '../../spaces/index.ts';
import type { AccountsFilter, UsersService } from '../../users/index.ts';
import { createSpaceLinksRepository } from '../space-links.repository.ts';
import { toAdminUserRow } from './adminUsers.mapper.ts';

interface Dependencies {
  users: UsersService;
  spaces: SpacesService;
}

const ROLES: Record<NonNullable<AdminUsersQuery['role']>, Role> = {
  user: 'USER',
  owner: 'OWNER',
  admin: 'ADMIN',
};

/** The list's filters as `users` applies them: every one is the account's own. */
function accountsFilterOf({ q, role, state }: AdminUsersQuery): AccountsFilter {
  return {
    ...(q !== undefined && { q }),
    ...(role && { role: ROLES[role] }),
    ...(state && { suspended: state === 'suspended' }),
  };
}

/**
 * The admin's users list, composed here because each row shows the spaces the person owns
 * (conventions §9, Composed reads); the owners page is the list filtered by role. `users` filters
 * and pages its own accounts; the page's owner links and their spaces follow, one query per module.
 */
export function createAdminUsersService({ users, spaces }: Dependencies) {
  const repository = createSpaceLinksRepository();
  return {
    async list(query: AdminUsersQuery): Promise<{ rows: AdminUserRow[]; total: number }> {
      const { rows, total } = await users.page(accountsFilterOf(query), query);
      if (rows.length === 0) return { rows: [], total };

      const links = await repository.findOwnerLinksOf(rows.map(({ id }) => id));
      // A soft-deleted space has no summary: its link counts for nothing (finding 18).
      const summaries =
        links.length === 0
          ? []
          : await spaces.summariesFor([...new Set(links.map(({ spaceId }) => spaceId))]);

      const spaceById = new Map(summaries.map((space) => [space.id, space]));
      return {
        rows: rows.map((account) =>
          toAdminUserRow(
            account,
            links.flatMap(({ userId, spaceId }) => {
              const space = userId === account.id ? spaceById.get(spaceId) : undefined;
              return space ? [space] : [];
            }),
          ),
        ),
        total,
      };
    },
  };
}

export type AdminUsersService = ReturnType<typeof createAdminUsersService>;
