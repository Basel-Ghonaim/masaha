import type { AdminUserRow, AdminUsersQuery } from '@masaha/shared/space-links';

import type { Role, SpaceManagerRole } from '../../../generated/prisma/enums.ts';
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
 * The admin's users list, composed here because each row shows the spaces the person owns and staffs
 * (conventions §9, Composed reads); the owners page is the list filtered by role. `users` filters
 * and pages its own accounts; the page's active links and their spaces follow, one query per module.
 */
export function createAdminUsersService({ users, spaces }: Dependencies) {
  const repository = createSpaceLinksRepository();
  return {
    async list(query: AdminUsersQuery): Promise<{ rows: AdminUserRow[]; total: number }> {
      const { rows, total } = await users.page(accountsFilterOf(query), query);
      if (rows.length === 0) return { rows: [], total };

      const links = await repository.findActiveLinksOf(rows.map(({ id }) => id));
      // A soft-deleted space has no summary: its link counts for nothing (finding 18).
      const summaries =
        links.length === 0
          ? []
          : await spaces.summariesFor([...new Set(links.map(({ spaceId }) => spaceId))]);

      const spaceById = new Map(summaries.map((space) => [space.id, space]));
      const spacesOf = (accountId: number, role: SpaceManagerRole) =>
        links.flatMap((link) => {
          const space =
            link.userId === accountId && link.role === role
              ? spaceById.get(link.spaceId)
              : undefined;
          return space ? [space] : [];
        });
      return {
        rows: rows.map((account) =>
          toAdminUserRow(account, spacesOf(account.id, 'OWNER'), spacesOf(account.id, 'RECEPTION')),
        ),
        total,
      };
    },
  };
}

export type AdminUsersService = ReturnType<typeof createAdminUsersService>;
