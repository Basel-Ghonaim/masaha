import type { AdminRoleChoice } from '@masaha/shared/space-links';

import type { RunInTransaction } from '../../../db/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { assertKeepsAnAdmin, assertNotOwnAccount, type UsersService } from '../../users/index.ts';
import { createSpaceLinksRepository } from '../space-links.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  users: UsersService;
}

/**
 * The admin's role changes (D1–D3): a person becomes an admin, or a user again. `OWNER` is never
 * given: it follows the person's owner links (ADR 0009), so a person with any active link keeps the
 * role the links give. The role, the sessions' end and the audit entry are `users`' (`changeRole`);
 * this module decides only what the links allow.
 */
export function createAdminRolesService({ runInTransaction, users }: Dependencies) {
  const repository = createSpaceLinksRepository();

  return {
    /**
     * Gives the person the role, under the person's session lock taken with every active admin's
     * row (conventions §13): never the actor's own account, never a person holding an active link,
     * never the last active admin. The same role again writes nothing; an unknown account is 404.
     */
    change(actorId: number, userId: number, role: AdminRoleChoice): Promise<void> {
      assertNotOwnAccount(actorId, userId);
      return runInTransaction(async (tx) => {
        const locked = await users.lockForAdminChange(userId, tx);
        if (!locked) throw AppError.notFound(undefined, 'Account not found');
        if (locked.account.role === role) return;
        // Counted under the person's lock, which every link change takes, so a link made meanwhile
        // counts (D3).
        if ((await repository.countActiveLinks(userId, tx)) > 0) {
          throw AppError.conflict('ACCOUNT_HAS_LINKS', 'The role follows the links');
        }
        assertKeepsAnAdmin(locked);
        await users.changeRole(locked.account, role, actorId, tx);
      });
    },
  };
}

export type AdminRolesService = ReturnType<typeof createAdminRolesService>;
