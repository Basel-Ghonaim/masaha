import type { AddedStaff, AddStaffRequest, StaffMember } from '@masaha/shared/space-links';

import type { RunInTransaction, Tx } from '../../../db/index.ts';
import type { AuditWriter } from '../../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { SpacesService } from '../../spaces/index.ts';
import type { UsersService } from '../../users/index.ts';
import { createSpaceLinksRepository } from '../space-links.repository.ts';
import { toStaffMember } from './staff.mapper.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  users: UsersService;
}

/**
 * The owner's staff (ADR 0009, revised): the space's reception accounts, created new by its owner
 * with a temporary password, listed whole. Every write takes the space's lock, so `can()` decides
 * on the links as they are (finding 43), then the person's session lock where it changes them
 * (conventions §13). Every account write is a `users` function (ADR 0013).
 */
export function createStaffService({ runInTransaction, audit, spaces, users }: Dependencies) {
  const repository = createSpaceLinksRepository();

  /** Locks the space and decides whether `actor` may manage its staff, on the links under it. */
  async function lockFor(actor: Actor, space: LoadedSpace, tx: Tx): Promise<void> {
    if (!(await spaces.lock(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, 'staff.manage', { links: await space.linksUnder(tx) })) {
      throw AppError.forbidden();
    }
  }

  return {
    /**
     * Every reception link of the space, active or not, oldest first, whole: the links here, the
     * accounts from `users`, one query each (conventions §9, Composed reads).
     */
    async list(spaceId: number): Promise<StaffMember[]> {
      const links = await repository.findReceptionLinksAt(spaceId);
      if (links.length === 0) return [];
      const accounts = new Map(
        (await users.staffAccounts(links.map(({ userId }) => userId))).map((account) => [
          account.id,
          account,
        ]),
      );
      return links.flatMap((link) => {
        const account = accounts.get(link.userId);
        return account ? [toStaffMember(link, account)] : [];
      });
    },

    /**
     * Creates a new reception account and links it, in one transaction: the space's lock and
     * `can()`; the account, with a temporary password hashed before; its link; the audit. An email
     * that has an account is refused by the users' unique key, never looked up first, so no
     * existing account is ever linked by an owner (ADR 0009, revised).
     */
    async add(
      actor: Actor,
      space: LoadedSpace,
      { name, email }: AddStaffRequest,
    ): Promise<AddedStaff> {
      const temporary = await users.issueTemporaryPassword();
      const userId = await runInTransaction(async (tx) => {
        await lockFor(actor, space, tx);
        const account = await users.createWithTemporaryPassword(
          { name, email, role: 'USER' },
          temporary.hash,
          actor.id,
          tx,
        );
        // The unique violation ended the transaction: nothing more runs in it.
        if (!account) {
          throw AppError.conflict('EMAIL_HAS_ACCOUNT', 'The email has an account', {
            email: ['not_unique'],
          });
        }
        await repository.linkReception(space.id, account.id, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.staffAdded',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            after: { userId: account.id },
          },
          tx,
        );
        return account.id;
      });
      return { userId, temporaryPassword: temporary.password };
    },
  };
}

export type StaffService = ReturnType<typeof createStaffService>;
